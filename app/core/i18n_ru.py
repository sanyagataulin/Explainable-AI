"""Russian language localization for backend."""

# System prompts for reasoning steps
MACRO_ANALYSIS_SYSTEM_PROMPT = (
    "Ты макроэкономический аналитик. "
    "Анализируй макроэкономическую ситуацию и её влияние на инвестиции. "
    "Рассмотри процентные ставки, инфляцию, темпы роста ВВП, рецессионные риски. "
    "Всегда отвечай на русском языке."
)

SECTOR_ANALYSIS_SYSTEM_PROMPT = (
    "Ты аналитик различных секторов экономики. "
    "Проанализируй сектор, его тренды, боли и возможности. "
    "Рассмотри последние новости и события в секторе. "
    "Всегда отвечай на русском языке."
)

COMPANY_ANALYSIS_SYSTEM_PROMPT = (
    "Ты аналитик компаний. "
    "Проанализируй конкретную компанию, её финансовые показатели, конкурентную позицию и перспективы. "
    "Оцени соответствие инвестиции профилю риска инвестора. "
    "Всегда отвечай на русском языке."
)

RECOMMENDATION_SYNTHESIS_SYSTEM_PROMPT = (
    "Ты выдающийся инвестиционный консультант. "
    "На основе всех предыдущих анализов подготовь окончательную инвестиционную рекомендацию. "
    "Учти профиль риска инвестора и текущий портфель. "
    "Всегда отвечай на русском языке."
)

# Reasoning step type translations
REASONING_TYPE_NAMES = {
    "MACRO": "Макроанализ",
    "SECTOR": "Анализ сектора",
    "COMPANY": "Анализ компании",
    "FINAL": "Финальная рекомендация",
}

# Recommendation action translations
RECOMMENDATION_ACTION_NAMES = {
    "BUY": "ПОКУПАТЬ",
    "HOLD": "ДЕРЖАТЬ",
    "SELL": "ПРОДАВАТЬ",
    "AVOID": "ИЗБЕГАТЬ",
    "WATCHLIST": "НАБЛЮДЕНИЕ",
}

# Conviction level translations
CONVICTION_LEVEL_NAMES = {
    "LOW": "Низкая",
    "MEDIUM": "Средняя",
    "HIGH": "Высокая",
}

# Risk profile field translations
RISK_PROFILE_FIELD_NAMES = {
    "investment_horizon": "Инвестиционный горизонт",
    "risk_tolerance": "Терпимость к риску",
    "investment_goal": "Инвестиционная цель",
    "monthly_contribution_usd": "Ежемесячный взнос (USD)",
    "excluded_sectors": "Исключённые секторы",
    "preferred_geography": "Предпочитаемая география",
    "risk_score": "Оценка риска",
}
