from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.enums import ConvictionLevel, MessageRole, RecommendationAction
from app.domain.entities.models import (
    Conversation,
    Message,
    PortfolioHolding,
    Recommendation,
    RiskProfile,
    UserProfile,
)
from app.domain.ports.repositories import ConversationRepository, ProfileRepository, RecommendationRepository
from app.infrastructure.db.models import (
    ConversationModel,
    MessageModel,
    PortfolioHoldingModel,
    RecommendationModel,
    RiskProfileModel,
    UserProfileModel,
)


class SQLAlchemyProfileRepository(ProfileRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_user(self, user: UserProfile) -> UserProfile:
        record = UserProfileModel(email=user.email, telegram_id=user.telegram_id)
        self._session.add(record)
        await self._session.commit()
        await self._session.refresh(record)
        return UserProfile.model_validate(record, from_attributes=True)

    async def get_user(self, user_id: int) -> UserProfile | None:
        row = await self._session.get(UserProfileModel, user_id)
        if row is None:
            return None
        return UserProfile.model_validate(row, from_attributes=True)

    async def get_risk_profile(self, user_id: int) -> RiskProfile | None:
        q = select(RiskProfileModel).where(RiskProfileModel.user_id == user_id)
        row = (await self._session.execute(q)).scalar_one_or_none()
        if row is None:
            return None
        return RiskProfile.model_validate(row, from_attributes=True)

    async def upsert_risk_profile(self, profile: RiskProfile) -> RiskProfile:
        q = select(RiskProfileModel).where(RiskProfileModel.user_id == profile.user_id)
        row = (await self._session.execute(q)).scalar_one_or_none()
        payload = profile.model_dump(exclude={"id", "updated_at"})
        if row is None:
            row = RiskProfileModel(**payload)
            self._session.add(row)
        else:
            for key, value in payload.items():
                setattr(row, key, value)

        await self._session.commit()
        await self._session.refresh(row)
        return RiskProfile.model_validate(row, from_attributes=True)

    async def upsert_portfolio(self, user_id: int, holdings: list[PortfolioHolding]) -> list[PortfolioHolding]:
        await self._session.execute(delete(PortfolioHoldingModel).where(PortfolioHoldingModel.user_id == user_id))
        rows = [
            PortfolioHoldingModel(
                user_id=user_id,
                ticker=h.ticker.upper(),
                weight_pct=h.weight_pct,
                avg_buy_price=h.avg_buy_price,
            )
            for h in holdings
        ]
        self._session.add_all(rows)
        await self._session.commit()
        for row in rows:
            await self._session.refresh(row)
        return [PortfolioHolding.model_validate(row, from_attributes=True) for row in rows]

    async def get_portfolio(self, user_id: int) -> list[PortfolioHolding]:
        q = select(PortfolioHoldingModel).where(PortfolioHoldingModel.user_id == user_id)
        rows = (await self._session.execute(q)).scalars().all()
        return [PortfolioHolding.model_validate(row, from_attributes=True) for row in rows]


class SQLAlchemyConversationRepository(ConversationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_conversation(self, conversation: Conversation) -> Conversation:
        row = ConversationModel(user_id=conversation.user_id, title=conversation.title)
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return Conversation.model_validate(row, from_attributes=True)

    async def get_messages(self, conversation_id: int, limit: int | None = None) -> list[Message]:
        q = select(MessageModel).where(MessageModel.conversation_id == conversation_id).order_by(MessageModel.created_at.desc())
        if limit:
            q = q.limit(limit)
        rows = list((await self._session.execute(q)).scalars().all())
        rows.reverse()
        return [Message.model_validate(row, from_attributes=True) for row in rows]

    async def add_message(self, message: Message) -> Message:
        row = MessageModel(
            conversation_id=message.conversation_id,
            role=message.role.value,
            content=message.content,
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return Message.model_validate(row, from_attributes=True)

    async def search_messages(self, user_id: int, query: str, limit: int = 20) -> list[Message]:
        q = (
            select(MessageModel)
            .join(ConversationModel, ConversationModel.id == MessageModel.conversation_id)
            .where(ConversationModel.user_id == user_id)
            .where(MessageModel.content.ilike(f"%{query}%"))
            .order_by(MessageModel.created_at.desc())
            .limit(limit)
        )
        rows = list((await self._session.execute(q)).scalars().all())
        rows.reverse()
        return [Message.model_validate(row, from_attributes=True) for row in rows]


class SQLAlchemyRecommendationRepository(RecommendationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_recommendation(self, recommendation: Recommendation) -> Recommendation:
        row = RecommendationModel(
            conversation_id=recommendation.conversation_id,
            user_id=recommendation.user_id,
            ticker=recommendation.ticker,
            company_name=recommendation.company_name,
            action=recommendation.action.value,
            conviction=recommendation.conviction.value,
            suggested_weight_pct=recommendation.suggested_weight_pct,
            reasoning_steps=[step.model_dump() for step in recommendation.reasoning_steps],
            risks=recommendation.risks,
            alternatives=recommendation.alternatives,
            time_horizon=recommendation.time_horizon,
        )
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._to_entity(row)

    async def get_recommendations(self, user_id: int) -> list[Recommendation]:
        q = select(RecommendationModel).where(RecommendationModel.user_id == user_id).order_by(RecommendationModel.created_at.desc())
        rows = (await self._session.execute(q)).scalars().all()
        return [self._to_entity(row) for row in rows]

    async def get_recommendation(self, recommendation_id: int) -> Recommendation | None:
        row = await self._session.get(RecommendationModel, recommendation_id)
        if row is None:
            return None
        return self._to_entity(row)

    def _to_entity(self, row: RecommendationModel) -> Recommendation:
        return Recommendation(
            id=row.id,
            conversation_id=row.conversation_id,
            user_id=row.user_id,
            ticker=row.ticker,
            company_name=row.company_name,
            action=RecommendationAction(row.action),
            conviction=ConvictionLevel(row.conviction),
            suggested_weight_pct=row.suggested_weight_pct,
            reasoning_steps=row.reasoning_steps,
            risks=row.risks,
            alternatives=row.alternatives,
            time_horizon=row.time_horizon,
            created_at=row.created_at,
        )
