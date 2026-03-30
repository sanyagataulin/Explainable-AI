from __future__ import annotations

from pydantic import BaseModel

from app.domain.entities.models import Recommendation


class RecommendationsResponse(BaseModel):
    recommendations: list[Recommendation]


class RecommendationResponse(BaseModel):
    recommendation: Recommendation
