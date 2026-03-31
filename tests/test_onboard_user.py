from app.application.use_cases.onboard_user import OnboardUser
from app.domain.entities.enums import InvestmentGoal, InvestmentHorizon, PreferredGeography, RiskTolerance
from app.domain.entities.models import PartialRiskProfilePatch, RiskProfile


class FakeProfileRepository:
    def __init__(self, existing: RiskProfile | None) -> None:
        self.existing = existing
        self.saved_profile: RiskProfile | None = None

    async def create_user(self, user):
        return user

    async def get_user(self, user_id: int):
        return None

    async def list_users(self):
        return []

    async def get_risk_profile(self, user_id: int) -> RiskProfile | None:
        return self.existing

    async def upsert_risk_profile(self, profile: RiskProfile) -> RiskProfile:
        self.saved_profile = profile
        return profile

    async def upsert_portfolio(self, user_id: int, holdings):
        return holdings

    async def get_portfolio(self, user_id: int):
        return []


class FakeLLMGateway:
    def __init__(self, patch: PartialRiskProfilePatch) -> None:
        self.patch = patch

    async def parse_risk_profile(self, answers: dict[str, str]) -> PartialRiskProfilePatch:
        return self.patch

    async def generate_reasoning_step(self, system_prompt: str, user_prompt: str) -> str:
        return ""

    async def synthesize_recommendation(self, risk_profile, ticker: str, company_name: str, steps):
        raise NotImplementedError


def make_existing_profile() -> RiskProfile:
    return RiskProfile(
        user_id=8,
        investment_horizon=InvestmentHorizon.LONG,
        risk_tolerance=RiskTolerance.MODERATE,
        investment_goal=InvestmentGoal.GROWTH,
        monthly_contribution_usd=1000.0,
        excluded_sectors=["tobacco"],
        preferred_geography=PreferredGeography.US,
        risk_score=6,
        recommended_allocation={"equities": 60.0, "bonds": 30.0, "cash": 10.0},
    )


async def test_onboard_merges_only_fields_returned_by_llm() -> None:
    repository = FakeProfileRepository(existing=make_existing_profile())
    gateway = FakeLLMGateway(
        PartialRiskProfilePatch(
            risk_tolerance=RiskTolerance.AGGRESSIVE,
            risk_score=8,
        )
    )
    use_case = OnboardUser(profile_repo=repository, llm_gateway=gateway)

    profile = await use_case.build_risk_profile(user_id=8, answers={"q1": "готов к большему риску"})

    assert profile.risk_tolerance == RiskTolerance.AGGRESSIVE
    assert profile.risk_score == 8
    assert profile.investment_horizon == InvestmentHorizon.LONG
    assert profile.monthly_contribution_usd == 1000.0
    assert profile.recommended_allocation == {"equities": 60.0, "bonds": 30.0, "cash": 10.0}


async def test_onboard_builds_missing_fields_from_defaults_for_new_profile() -> None:
    repository = FakeProfileRepository(existing=None)
    gateway = FakeLLMGateway(
        PartialRiskProfilePatch(
            risk_tolerance=RiskTolerance.AGGRESSIVE,
            investment_goal=InvestmentGoal.SPECULATION,
        )
    )
    use_case = OnboardUser(profile_repo=repository, llm_gateway=gateway)

    profile = await use_case.build_risk_profile(user_id=12, answers={"q1": "хочу более рискованный профиль"})

    assert profile.user_id == 12
    assert profile.risk_tolerance == RiskTolerance.AGGRESSIVE
    assert profile.investment_goal == InvestmentGoal.SPECULATION
    assert profile.investment_horizon == InvestmentHorizon.LONG
    assert profile.monthly_contribution_usd == 1000.0
    assert profile.preferred_geography == PreferredGeography.US
    assert profile.risk_score == 6
    assert profile.recommended_allocation == {"equities": 80.0, "bonds": 10.0, "cash": 10.0}