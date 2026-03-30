from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.entities.models import (
    Conversation,
    Message,
    PortfolioHolding,
    Recommendation,
    RiskProfile,
    UserProfile,
)


class ProfileRepository(ABC):
    @abstractmethod
    async def create_user(self, user: UserProfile) -> UserProfile:
        ...

    @abstractmethod
    async def get_user(self, user_id: int) -> UserProfile | None:
        ...

    @abstractmethod
    async def list_users(self) -> list[UserProfile]:
        ...

    @abstractmethod
    async def get_risk_profile(self, user_id: int) -> RiskProfile | None:
        ...

    @abstractmethod
    async def upsert_risk_profile(self, profile: RiskProfile) -> RiskProfile:
        ...

    @abstractmethod
    async def upsert_portfolio(self, user_id: int, holdings: list[PortfolioHolding]) -> list[PortfolioHolding]:
        ...

    @abstractmethod
    async def get_portfolio(self, user_id: int) -> list[PortfolioHolding]:
        ...


class ConversationRepository(ABC):
    @abstractmethod
    async def create_conversation(self, conversation: Conversation) -> Conversation:
        ...

    @abstractmethod
    async def get_messages(self, conversation_id: int, limit: int | None = None) -> list[Message]:
        ...

    @abstractmethod
    async def add_message(self, message: Message) -> Message:
        ...

    @abstractmethod
    async def search_messages(self, user_id: int, query: str, limit: int = 20) -> list[Message]:
        ...


class RecommendationRepository(ABC):
    @abstractmethod
    async def create_recommendation(self, recommendation: Recommendation) -> Recommendation:
        ...

    @abstractmethod
    async def get_recommendations(self, user_id: int) -> list[Recommendation]:
        ...

    @abstractmethod
    async def get_recommendation(self, recommendation_id: int) -> Recommendation | None:
        ...


class DocumentRepository(ABC):
    @abstractmethod
    async def save_document(self, company: str, filename: str, raw_bytes: bytes) -> str:
        ...


class VectorRepository(ABC):
    @abstractmethod
    async def index_document(self, namespace: str, text: str, metadata: dict[str, str]) -> None:
        ...

    @abstractmethod
    async def retrieve(self, namespace: str, query: str, k: int) -> list[dict[str, str]]:
        ...


class MarketDataPort(ABC):
    @abstractmethod
    async def get_company_metrics(self, ticker: str) -> dict[str, float | str | None]:
        ...
