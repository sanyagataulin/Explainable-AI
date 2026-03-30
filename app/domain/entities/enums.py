from __future__ import annotations

from enum import Enum


class InvestmentHorizon(str, Enum):
    SHORT = "SHORT"
    MEDIUM = "MEDIUM"
    LONG = "LONG"


class RiskTolerance(str, Enum):
    CONSERVATIVE = "CONSERVATIVE"
    MODERATE = "MODERATE"
    AGGRESSIVE = "AGGRESSIVE"


class InvestmentGoal(str, Enum):
    CAPITAL_PRESERVATION = "CAPITAL_PRESERVATION"
    INCOME = "INCOME"
    GROWTH = "GROWTH"
    SPECULATION = "SPECULATION"


class PreferredGeography(str, Enum):
    US = "US"
    GLOBAL = "GLOBAL"
    EM = "EM"
    EUROPE = "EUROPE"


class MessageRole(str, Enum):
    USER = "USER"
    ASSISTANT = "ASSISTANT"
    SYSTEM = "SYSTEM"


class RecommendationAction(str, Enum):
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"
    AVOID = "AVOID"
    WATCHLIST = "WATCHLIST"


class ConvictionLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ReasoningType(str, Enum):
    MACRO = "MACRO"
    SECTOR = "SECTOR"
    COMPANY = "COMPANY"
    FINAL = "FINAL"
