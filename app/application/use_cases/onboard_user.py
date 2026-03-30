from __future__ import annotations

from dataclasses import dataclass

from app.application.ports.gateways import LLMGateway
from app.domain.entities.models import RiskProfile, UserProfile
from app.domain.ports.repositories import ProfileRepository


@dataclass(slots=True)
class OnboardUser:
    profile_repo: ProfileRepository
    llm_gateway: LLMGateway

    async def create_user(self, email: str, telegram_id: str | None = None) -> UserProfile:
        return await self.profile_repo.create_user(UserProfile(email=email, telegram_id=telegram_id))

    async def build_risk_profile(self, user_id: int, answers: dict[str, str]) -> RiskProfile:
        parsed = await self.llm_gateway.parse_risk_profile(answers)
        parsed.user_id = user_id
        return await self.profile_repo.upsert_risk_profile(parsed)
