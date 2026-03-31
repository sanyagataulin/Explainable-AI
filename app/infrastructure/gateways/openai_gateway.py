from __future__ import annotations

import json
from typing import Any, cast

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel, Field, SecretStr

from app.application.ports.gateways import EmbeddingGateway, LLMGateway
from app.core.settings import Settings
from app.domain.entities.enums import (
    ConvictionLevel,
    RecommendationAction,
)
from app.domain.entities.models import PartialRiskProfilePatch, Recommendation, RiskProfile


class RecommendationSynthesisResult(BaseModel):
    action: RecommendationAction
    conviction: ConvictionLevel
    suggested_weight_pct: float = Field(ge=0.0, le=100.0)
    risks: list[str] = Field(default_factory=list)
    alternatives: list[str] = Field(default_factory=list)
    time_horizon: str | None = None


class OpenAIGateway(LLMGateway, EmbeddingGateway):
    def __init__(self, settings: Settings) -> None:
        api_key = SecretStr(settings.openai_api_key) if settings.openai_api_key else None
        self._llm = ChatOpenAI(model=settings.openai_model, api_key=api_key, temperature=0.2)
        self._embeddings = OpenAIEmbeddings(
            model=settings.openai_embedding_model,
            api_key=api_key,
        )

    async def parse_risk_profile(self, answers: dict[str, str]) -> PartialRiskProfilePatch:
        prompt = (
            "Parse user answers into partial JSON with fields: "
            "investment_horizon (SHORT|MEDIUM|LONG), risk_tolerance (CONSERVATIVE|MODERATE|AGGRESSIVE), "
            "investment_goal (CAPITAL_PRESERVATION|INCOME|GROWTH|SPECULATION), monthly_contribution_usd (number), "
            "excluded_sectors (string array), preferred_geography (US|GLOBAL|EM|EUROPE), risk_score (1-10), "
            "recommended_allocation (object with equities,bonds,cash,alternatives in %). "
            "Return only values you can infer from the answers. For unknown fields return null and do not guess."
            f"\nAnswers: {answers}"
        )
        structured_llm = self._llm.with_structured_output(PartialRiskProfilePatch)
        response = await structured_llm.ainvoke(prompt)
        data: PartialRiskProfilePatch
        if isinstance(response, PartialRiskProfilePatch):
            data = response
        elif isinstance(response, dict):
            data = PartialRiskProfilePatch.model_validate(response)
        else:
            data = PartialRiskProfilePatch.model_validate(cast(Any, response))
        return data

    async def generate_reasoning_step(self, system_prompt: str, user_prompt: str) -> str:
        response = await self._llm.ainvoke([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ])
        return response.content if isinstance(response.content, str) else json.dumps(response.content)

    async def synthesize_recommendation(
        self,
        risk_profile: RiskProfile,
        ticker: str,
        company_name: str,
        steps: list[dict[str, str]],
    ) -> Recommendation:
        prompt = (
            "Return strict JSON with fields action, conviction, suggested_weight_pct, risks, alternatives, time_horizon. "
            f"Risk profile: {risk_profile.model_dump()} Steps: {steps}"
        )
        structured_llm = self._llm.with_structured_output(RecommendationSynthesisResult)
        response = await structured_llm.ainvoke(prompt)
        data: RecommendationSynthesisResult
        if isinstance(response, RecommendationSynthesisResult):
            data = response
        elif isinstance(response, dict):
            data = RecommendationSynthesisResult.model_validate(response)
        else:
            data = RecommendationSynthesisResult.model_validate(cast(Any, response))
        return Recommendation(
            conversation_id=0,
            user_id=risk_profile.user_id,
            ticker=ticker,
            company_name=company_name,
            action=data.action,
            conviction=data.conviction,
            suggested_weight_pct=float(data.suggested_weight_pct),
            risks=list(data.risks),
            alternatives=list(data.alternatives),
            time_horizon=data.time_horizon or risk_profile.investment_horizon.value,
        )

    async def embed_text(self, text: str) -> list[float]:
        return await self._embeddings.aembed_query(text)
