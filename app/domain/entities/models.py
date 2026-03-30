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
