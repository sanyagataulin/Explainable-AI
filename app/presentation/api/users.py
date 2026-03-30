from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.domain.entities.models import PortfolioHolding, RiskProfile
from app.presentation.api.deps import get_request_container
from app.presentation.schemas.users import (
    BuildRiskProfileRequest,
    CreateUserRequest,
    PortfolioResponse,
    PutRiskProfileRequest,
    RiskProfileResponse,
    UpsertPortfolioRequest,
    UserResponse,
)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse)
async def create_user(payload: CreateUserRequest, c=Depends(get_request_container)) -> UserResponse:
    user = await c.onboard.create_user(payload.email, payload.telegram_id)
    return UserResponse(user=user)


@router.get("/{user_id}/profile", response_model=RiskProfileResponse)
async def get_profile(user_id: int, c=Depends(get_request_container)) -> RiskProfileResponse:
    profile = await c.onboard.profile_repo.get_risk_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Risk profile not found")
    return RiskProfileResponse(profile=profile)


@router.put("/{user_id}/profile", response_model=RiskProfileResponse)
async def update_profile(
    user_id: int,
    payload: BuildRiskProfileRequest | PutRiskProfileRequest,
    c=Depends(get_request_container),
) -> RiskProfileResponse:
    if isinstance(payload, BuildRiskProfileRequest):
        profile = await c.onboard.build_risk_profile(user_id=user_id, answers=payload.answers)
        return RiskProfileResponse(profile=profile)

    profile = await c.onboard.profile_repo.upsert_risk_profile(
        RiskProfile(user_id=user_id, **payload.model_dump())
    )
    return RiskProfileResponse(profile=profile)


@router.post("/{user_id}/portfolio", response_model=PortfolioResponse)
async def save_portfolio(user_id: int, payload: UpsertPortfolioRequest, c=Depends(get_request_container)) -> PortfolioResponse:
    holdings = [PortfolioHolding(user_id=user_id, **item.model_dump()) for item in payload.holdings]
    saved = await c.save_portfolio.execute(user_id, holdings)
    return PortfolioResponse(holdings=saved)
