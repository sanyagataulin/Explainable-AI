from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import TypedDict

import structlog
from langgraph.graph import END, StateGraph

from app.application.ports.gateways import LLMGateway, NewsGateway
from app.core.settings import Settings
from app.domain.entities.enums import ReasoningType
from app.domain.entities.models import Message, PortfolioHolding, ReasoningStep, RiskProfile
from app.domain.ports.repositories import MarketDataPort, VectorRepository

logger = structlog.get_logger(__name__)


class GraphState(TypedDict):
    question: str
    ticker: str
    sector: str
    company_name: str
    profile: RiskProfile
    history: list[Message]
    portfolio: list[PortfolioHolding]
    steps: list[ReasoningStep]
    metrics: dict[str, float | str | None]


class RecommendationGraphEngine:
    def __init__(
        self,
        llm_gateway: LLMGateway,
        news_gateway: NewsGateway,
        market_data_port: MarketDataPort,
        vector_repo: VectorRepository,
        settings: Settings,
    ) -> None:
        self._llm_gateway = llm_gateway
        self._news_gateway = news_gateway
        self._market_data_port = market_data_port
        self._vector_repo = vector_repo
        self._settings = settings
        self._graph = self._build_graph(full=True)
        self._short_graph = self._build_graph(full=False)

    def _build_graph(self, full: bool) -> StateGraph:
        graph = StateGraph(GraphState)
        if full:
            graph.add_node("macro", self._macro_node)
            graph.add_node("sector_analysis", self._sector_node)
            graph.add_node("company", self._company_node)
            graph.add_node("recommendation", self._recommendation_node)
            graph.set_entry_point("macro")
            graph.add_edge("macro", "sector_analysis")
            graph.add_edge("sector_analysis", "company")
            graph.add_edge("company", "recommendation")
            graph.add_edge("recommendation", END)
        else:
            graph.add_node("company", self._company_node)
            graph.add_node("recommendation", self._recommendation_node)
            graph.set_entry_point("company")
            graph.add_edge("company", "recommendation")
            graph.add_edge("recommendation", END)
        return graph.compile()

    async def _macro_node(self, state: GraphState) -> GraphState:
        text = await self._llm_gateway.generate_reasoning_step(
            system_prompt=f"You are macro analyst. User risk profile: {state['profile'].model_dump()}",
            user_prompt=f"Evaluate rates, inflation, recession impact for question: {state['question']}",
        )
        step = ReasoningStep(
            type=ReasoningType.MACRO,
            content=text,
            metadata={"implication": "macro to asset classes"},
        )
        state["steps"].append(step)
        return state

    async def _sector_node(self, state: GraphState) -> GraphState:
        news = await self._news_gateway.search_finance_news(f"{state['sector']} sector outlook latest")
        synopsis = "\n".join(item["content"] for item in news if item.get("content"))
        text = await self._llm_gateway.generate_reasoning_step(
            system_prompt=f"Analyze sector sentiment for profile {state['profile'].model_dump()}",
            user_prompt=f"Sector: {state['sector']} news:\n{synopsis}",
        )
        step = ReasoningStep(
            type=ReasoningType.SECTOR,
            content=text,
            sources=[{"title": n["title"], "url": n["url"]} for n in news],
            metadata={"sentiment": "derived"},
        )
        state["steps"].append(step)
        return state

    async def _company_node(self, state: GraphState) -> GraphState:
        metrics = await self._market_data_port.get_company_metrics(state["ticker"])
        docs = await self._vector_repo.retrieve(
            namespace=state["ticker"].upper(), query=state["question"], k=self._settings.retrieval_k
        )
        doc_context = "\n".join(item["content"] for item in docs)
        text = await self._llm_gateway.generate_reasoning_step(
            system_prompt=f"Company analyst. User profile: {state['profile'].model_dump()}",
            user_prompt=(
                f"Question: {state['question']}\nMetrics:{metrics}\nDocs:{doc_context}"
                f"\nCurrent portfolio: {[h.model_dump() for h in state['portfolio']]}"
            ),
        )
        step = ReasoningStep(
            type=ReasoningType.COMPANY,
            content=text,
            sources=[{"title": d["source"], "url": "local://vector"} for d in docs],
            metadata={
                "fit_score": 0.7,
                "pe": metrics.get("pe") or 0,
                "ev_ebitda": metrics.get("ev_ebitda") or 0,
                "revenue_growth": metrics.get("revenue_growth") or 0,
                "debt_to_equity": metrics.get("debt_to_equity") or 0,
            },
        )
        state["metrics"] = metrics
        state["company_name"] = str(metrics.get("company_name") or state["ticker"])
        state["steps"].append(step)
        return state

    async def _recommendation_node(self, state: GraphState) -> GraphState:
        text = await self._llm_gateway.generate_reasoning_step(
            system_prompt=f"Generate final recommendation for profile {state['profile'].model_dump()}",
            user_prompt=(
                f"Use prior steps: {[s.model_dump() for s in state['steps']]}"
                f" and rebalance around portfolio {[h.model_dump() for h in state['portfolio']]}"
            ),
        )
        step = ReasoningStep(
            type=ReasoningType.FINAL,
            content=text,
            metadata={"disclaimer": "Не является инвестиционной рекомендацией. Только для образовательных целей."},
        )
        state["steps"].append(step)
        return state

    async def stream_steps(
        self,
        risk_profile: RiskProfile,
        question: str,
        history: list[Message],
        portfolio: list[PortfolioHolding],
    ) -> AsyncGenerator[ReasoningStep, None]:
        ticker = self._extract_ticker(question)
        state: GraphState = {
            "question": question,
            "ticker": ticker,
            "sector": "Technology",
            "company_name": ticker,
            "profile": risk_profile,
            "history": history[-self._settings.max_conversation_history :],
            "portfolio": portfolio,
            "steps": [],
            "metrics": {},
        }

        runnable = self._graph
        previous = 0
        async for event in runnable.astream(state):
            final_state = event
            steps = final_state["steps"]
            if len(steps) > previous:
                yield steps[-1]
                previous = len(steps)

    async def stream_short_steps(
        self,
        user_id: int,
        conversation_id: int,
        question: str,
        use_case,
    ) -> AsyncGenerator[ReasoningStep, None]:
        profile = await use_case.profile_repo.get_risk_profile(user_id)
        if profile is None:
            raise ValueError("Profile not found")
        history = await use_case.conversation_repo.get_messages(conversation_id, limit=10)
        ticker = self._extract_ticker(question)
        state: GraphState = {
            "question": question,
            "ticker": ticker,
            "sector": "Technology",
            "company_name": ticker,
            "profile": profile,
            "history": history,
            "portfolio": await use_case.profile_repo.get_portfolio(user_id),
            "steps": [],
            "metrics": {},
        }
        previous = 0
        async for event in self._short_graph.astream(state):
            steps = event["steps"]
            if len(steps) > previous:
                yield steps[-1]
                previous = len(steps)

    @staticmethod
    def _extract_ticker(question: str) -> str:
        for token in question.replace("?", " ").split():
            if token.isupper() and len(token) <= 5 and token.isalpha():
                return token
        if "apple" in question.lower():
            return "AAPL"
        return "SPY"
