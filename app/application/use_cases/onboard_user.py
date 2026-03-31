from __future__ import annotations

from dataclasses import dataclass

from app.application.ports.gateways import LLMGateway
from app.domain.entities.enums import InvestmentGoal, InvestmentHorizon, PreferredGeography, RiskTolerance
from app.domain.entities.models import RiskProfile, UserProfile, build_default_allocation
from app.domain.ports.repositories import ProfileRepository


@dataclass(slots=True)
class OnboardUser:
    profile_repo: ProfileRepository
    llm_gateway: LLMGateway

    async def create_user(self, email: str, telegram_id: str | None = None) -> UserProfile:
        return await self.profile_repo.create_user(UserProfile(email=email, telegram_id=telegram_id))

    async def build_risk_profile(self, user_id: int, answers: dict[str, str]) -> RiskProfile:
        parsed = await self.llm_gateway.parse_risk_profile(answers)
        existing = await self.profile_repo.get_risk_profile(user_id)
        base_profile = existing or self._build_default_profile(user_id)
        patch_data = parsed.model_dump(exclude_none=True)

        if existing is None and "recommended_allocation" not in patch_data:
            next_risk_tolerance = patch_data.get("risk_tolerance", base_profile.risk_tolerance)
            patch_data["recommended_allocation"] = build_default_allocation(next_risk_tolerance)

        merged = base_profile.model_copy(update=patch_data)
        return await self.profile_repo.upsert_risk_profile(merged)

    def _build_default_profile(self, user_id: int) -> RiskProfile:
        risk_tolerance = RiskTolerance.MODERATE
        return RiskProfile(
            user_id=user_id,
            investment_horizon=InvestmentHorizon.LONG,
            risk_tolerance=risk_tolerance,
            investment_goal=InvestmentGoal.GROWTH,
            monthly_contribution_usd=1000.0,
            excluded_sectors=[],
            preferred_geography=PreferredGeography.US,
            risk_score=6,
            recommended_allocation=build_default_allocation(risk_tolerance),
        )
