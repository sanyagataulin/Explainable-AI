from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.entities.models import PartialRiskProfilePatch, Recommendation, RiskProfile


class LLMGateway(ABC):
    @abstractmethod
    async def parse_risk_profile(self, answers: dict[str, str]) -> PartialRiskProfilePatch:
        ...

    @abstractmethod
    async def generate_reasoning_step(self, system_prompt: str, user_prompt: str) -> str:
        ...

    @abstractmethod
    async def synthesize_recommendation(
        self,
        risk_profile: RiskProfile,
        ticker: str,
        company_name: str,
        steps: list[dict[str, str]],
    ) -> Recommendation:
        ...


class EmbeddingGateway(ABC):
    @abstractmethod
    async def embed_text(self, text: str) -> list[float]:
        ...


class NewsGateway(ABC):
    @abstractmethod
    async def search_finance_news(self, query: str, max_results: int = 5) -> list[dict[str, str]]:
        ...
