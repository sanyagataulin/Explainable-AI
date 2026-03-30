from __future__ import annotations

from dataclasses import dataclass

from app.domain.entities.models import PortfolioHolding
from app.domain.ports.repositories import ProfileRepository


@dataclass(slots=True)
class SavePortfolio:
    profile_repo: ProfileRepository

    async def execute(self, user_id: int, holdings: list[PortfolioHolding]) -> list[PortfolioHolding]:
        for h in holdings:
            h.user_id = user_id
        return await self.profile_repo.upsert_portfolio(user_id, holdings)
