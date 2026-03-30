from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.presentation.api.deps import get_request_container
from app.presentation.schemas.recommendations import RecommendationResponse, RecommendationsResponse

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("", response_model=RecommendationsResponse)
async def list_recommendations(user_id: int, c=Depends(get_request_container)) -> RecommendationsResponse:
    items = await c.generate_recommendation.recommendation_repo.get_recommendations(user_id)
    return RecommendationsResponse(recommendations=items)


@router.get("/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation(recommendation_id: int, c=Depends(get_request_container)) -> RecommendationResponse:
    item = await c.generate_recommendation.recommendation_repo.get_recommendation(recommendation_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return RecommendationResponse(recommendation=item)
