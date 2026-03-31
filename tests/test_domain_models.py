from app.domain.entities.enums import InvestmentGoal, InvestmentHorizon, PreferredGeography, RiskTolerance
from app.domain.entities.models import RiskProfile, build_default_allocation


def test_risk_profile_is_valid() -> None:
    profile = RiskProfile(
        user_id=1,
        investment_horizon=InvestmentHorizon.LONG,
        risk_tolerance=RiskTolerance.MODERATE,
        investment_goal=InvestmentGoal.GROWTH,
        monthly_contribution_usd=500,
        excluded_sectors=["tobacco"],
        preferred_geography=PreferredGeography.US,
        risk_score=7,
        recommended_allocation={"equities": 60, "bonds": 25, "cash": 10, "alternatives": 5},
    )

    assert profile.risk_score == 7
    assert profile.recommended_allocation["equities"] == 60


def test_build_default_allocation_uses_risk_tolerance() -> None:
    assert build_default_allocation(RiskTolerance.CONSERVATIVE) == {
        "equities": 30.0,
        "bonds": 50.0,
        "cash": 20.0,
    }
    assert build_default_allocation(RiskTolerance.MODERATE) == {
        "equities": 60.0,
        "bonds": 30.0,
        "cash": 10.0,
    }
    assert build_default_allocation(RiskTolerance.AGGRESSIVE) == {
        "equities": 80.0,
        "bonds": 10.0,
        "cash": 10.0,
    }
