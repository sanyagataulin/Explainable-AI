from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities.enums import (
    ConvictionLevel,
    InvestmentGoal,
    InvestmentHorizon,
    MessageRole,
    PreferredGeography,
    ReasoningType,
    RecommendationAction,
    RiskTolerance,
)


class UserProfile(BaseModel):
    id: int | None = None
    telegram_id: str | None = None
    email: str
    created_at: datetime | None = None


class RiskProfile(BaseModel):
    id: int | None = None
    user_id: int
    investment_horizon: InvestmentHorizon
    risk_tolerance: RiskTolerance
    investment_goal: InvestmentGoal
    monthly_contribution_usd: float
    excluded_sectors: list[str] = Field(default_factory=list)
    preferred_geography: PreferredGeography
    risk_score: int = Field(ge=1, le=10)
    recommended_allocation: dict[str, float]
    updated_at: datetime | None = None


class PartialRiskProfilePatch(BaseModel):
    investment_horizon: InvestmentHorizon | None = None
    risk_tolerance: RiskTolerance | None = None
    investment_goal: InvestmentGoal | None = None
    monthly_contribution_usd: float | None = None
    excluded_sectors: list[str] | None = None
    preferred_geography: PreferredGeography | None = None
    risk_score: int | None = Field(default=None, ge=1, le=10)
    recommended_allocation: dict[str, float] | None = None


def build_default_allocation(risk_tolerance: RiskTolerance) -> dict[str, float]:
    if risk_tolerance == RiskTolerance.CONSERVATIVE:
        return {"equities": 30.0, "bonds": 50.0, "cash": 20.0}
    if risk_tolerance == RiskTolerance.AGGRESSIVE:
        return {"equities": 80.0, "bonds": 10.0, "cash": 10.0}
    return {"equities": 60.0, "bonds": 30.0, "cash": 10.0}


class Conversation(BaseModel):
    id: int | None = None
    user_id: int
    title: str
    created_at: datetime | None = None


class Message(BaseModel):
    id: int | None = None
    conversation_id: int
    role: MessageRole
    content: str
    created_at: datetime | None = None


class ReasoningStep(BaseModel):
    type: ReasoningType
    content: str
    sources: list[dict[str, str]] = Field(default_factory=list)
    metadata: dict[str, str | float | int | bool] = Field(default_factory=dict)


class Recommendation(BaseModel):
    id: int | None = None
    conversation_id: int
    user_id: int
    ticker: str
    company_name: str
    action: RecommendationAction
    conviction: ConvictionLevel
    suggested_weight_pct: float = Field(ge=0.0, le=100.0)
    reasoning_steps: list[ReasoningStep] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    alternatives: list[str] = Field(default_factory=list)
    time_horizon: str
    disclaimer: str = "Не является инвестиционной рекомендацией. Только для образовательных целей."
    created_at: datetime | None = None


class PortfolioHolding(BaseModel):
    id: int | None = None
    user_id: int
    ticker: str
    weight_pct: float = Field(ge=0.0, le=100.0)
    avg_buy_price: float = Field(gt=0)
    added_at: datetime | None = None
