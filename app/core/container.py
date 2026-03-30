from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ports.gateways import LLMGateway
from app.application.use_cases.conversation import ConversationUseCases
from app.application.use_cases.documents import IndexDocument
from app.application.use_cases.onboard_user import OnboardUser
from app.application.use_cases.portfolio import SavePortfolio
from app.application.use_cases.recommendation import ContinueConversation, GenerateRecommendation
from app.core.settings import Settings, get_settings
from app.infrastructure.gateways.market_data_gateway import YFinanceMarketDataGateway
from app.infrastructure.gateways.news_gateway import DuckDuckGoNewsGateway
from app.infrastructure.gateways.openai_gateway import OpenAIGateway
from app.infrastructure.gateways.redis_cache import RedisCache
from app.infrastructure.graph.recommendation_graph import RecommendationGraphEngine
from app.infrastructure.rag.faiss_repository import FAISSVectorRepository
from app.infrastructure.repositories.document_repository import LocalDocumentRepository
from app.infrastructure.repositories.sqlalchemy_repositories import (
    SQLAlchemyConversationRepository,
    SQLAlchemyProfileRepository,
    SQLAlchemyRecommendationRepository,
)


@dataclass(slots=True)
class RequestContainer:
    onboard: OnboardUser
    conversation: ConversationUseCases
    generate_recommendation: GenerateRecommendation
    continue_conversation: ContinueConversation
    index_document: IndexDocument
    save_portfolio: SavePortfolio
    llm_gateway: LLMGateway


class AppContainer:
    def __init__(self) -> None:
        self.settings: Settings = get_settings()
        self.cache = RedisCache(self.settings.redis_url)
        self.openai_gateway = OpenAIGateway(self.settings)
        self.news_gateway = DuckDuckGoNewsGateway()
        self.market_gateway = YFinanceMarketDataGateway(self.cache, self.settings)
        self.vector_repo = FAISSVectorRepository(self.settings)
        self.document_repo = LocalDocumentRepository()
        self.graph_engine = RecommendationGraphEngine(
            llm_gateway=self.openai_gateway,
            news_gateway=self.news_gateway,
            market_data_port=self.market_gateway,
            vector_repo=self.vector_repo,
            settings=self.settings,
        )

    def for_session(self, session: AsyncSession) -> RequestContainer:
        profile_repo = SQLAlchemyProfileRepository(session)
        conversation_repo = SQLAlchemyConversationRepository(session)
        recommendation_repo = SQLAlchemyRecommendationRepository(session)

        onboard = OnboardUser(profile_repo=profile_repo, llm_gateway=self.openai_gateway)
        conversation = ConversationUseCases(conversation_repo=conversation_repo)
        generate_recommendation = GenerateRecommendation(
            profile_repo=profile_repo,
            conversation_repo=conversation_repo,
            recommendation_repo=recommendation_repo,
            graph_engine=self.graph_engine,
        )
        return RequestContainer(
            onboard=onboard,
            conversation=conversation,
            generate_recommendation=generate_recommendation,
            continue_conversation=ContinueConversation(generate_recommendation=generate_recommendation),
            index_document=IndexDocument(document_repo=self.document_repo, vector_repo=self.vector_repo),
            save_portfolio=SavePortfolio(profile_repo=profile_repo),
            llm_gateway=self.openai_gateway,
        )


container = AppContainer()
