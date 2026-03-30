from __future__ import annotations

from collections.abc import AsyncGenerator
from dataclasses import dataclass

from app.domain.entities.models import Recommendation, ReasoningStep
from app.domain.ports.repositories import ConversationRepository, ProfileRepository, RecommendationRepository
from app.infrastructure.graph.recommendation_graph import RecommendationGraphEngine


@dataclass(slots=True)
class GenerateRecommendation:
    profile_repo: ProfileRepository
    conversation_repo: ConversationRepository
    recommendation_repo: RecommendationRepository
    graph_engine: RecommendationGraphEngine

    async def stream(
        self,
        user_id: int,
        conversation_id: int,
        question: str,
    ) -> AsyncGenerator[ReasoningStep, None]:
        profile = await self.profile_repo.get_risk_profile(user_id)
        if profile is None:
            raise ValueError("Risk profile is not found. Complete onboarding first.")

        history = await self.conversation_repo.get_messages(conversation_id, limit=10)
        portfolio = await self.profile_repo.get_portfolio(user_id)
        async for step in self.graph_engine.stream_steps(
            risk_profile=profile,
            question=question,
            history=history,
            portfolio=portfolio,
        ):
            yield step

    async def save_result(self, recommendation: Recommendation) -> Recommendation:
        return await self.recommendation_repo.create_recommendation(recommendation)


@dataclass(slots=True)
class ContinueConversation:
    generate_recommendation: GenerateRecommendation

    async def stream(
        self,
        user_id: int,
        conversation_id: int,
        question: str,
    ) -> AsyncGenerator[ReasoningStep, None]:
        async for step in self.generate_recommendation.graph_engine.stream_short_steps(
            user_id=user_id,
            conversation_id=conversation_id,
            question=question,
            use_case=self.generate_recommendation,
        ):
            yield step
