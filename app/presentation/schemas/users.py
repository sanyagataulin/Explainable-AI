from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.domain.entities.enums import InvestmentGoal, InvestmentHorizon, PreferredGeography, RiskTolerance
from app.domain.entities.models import PortfolioHolding, RiskProfile, UserProfile


class CreateUserRequest(BaseModel):
    email: EmailStr
    telegram_id: str | None = None


class UserResponse(BaseModel):
    user: UserProfile


class BuildRiskProfileRequest(BaseModel):
    answers: dict[str, str] = Field(description="Raw free-text answers for 6 onboarding questions")


class PutRiskProfileRequest(BaseModel):
    investment_horizon: InvestmentHorizon
    risk_tolerance: RiskTolerance
    investment_goal: InvestmentGoal
    monthly_contribution_usd: float
    excluded_sectors: list[str] = Field(default_factory=list)
    preferred_geography: PreferredGeography
    risk_score: int = Field(ge=1, le=10)
    recommended_allocation: dict[str, float]


class RiskProfileResponse(BaseModel):
    profile: RiskProfile


class PortfolioHoldingInput(BaseModel):
    ticker: str
    weight_pct: float = Field(ge=0, le=100)
    avg_buy_price: float = Field(gt=0)


class UpsertPortfolioRequest(BaseModel):
    holdings: list[PortfolioHoldingInput]


class PortfolioResponse(BaseModel):
    holdings: list[PortfolioHolding]
