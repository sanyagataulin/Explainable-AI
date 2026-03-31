export const ru = {
  common: {
    userId: "ID пользователя",
    conversationId: "ID беседы",
    loading: "Загрузка...",
    noData: "Нет данных",
    error: "Ошибка",
  },

  header: {
    title: "Советник по инвестициям с объяснениями",
    subtitle: "Рассуждения от макроэкономики к компаниям в реальном времени",
  },

  sessionSetup: {
    title: "Создание сессии",
    createNewUser: "Создать нового пользователя",
    emailPlaceholder: "Email",
    buttonCreate: "Создать пользователя + беседу",
    buttonCreating: "Создание...",
    statusLabel: "Статус:",
    statusUserIdLabel: "ID пользователя:",
    statusConversationIdLabel: "ID беседы:",
  },

  askQuestion: {
    title: "Задать инвестиционный вопрос",
    questionPlaceholder: "Ваш вопрос об инвестициях...",
    buttonRun: "Запустить анализ",
    buttonStreaming: "Анализ...",
  },

  chainOfThought: {
    title: "Цепочка рассуждений",
    noSteps: "Шагов нет.",
    streamError: "Ошибка трансляции",
    timeout: "Истек лимит времени ожидания",
    connectionError: "Ошибка подключения",
  },

  latestRecommendation: {
    title: "Последняя рекомендация",
    noRecommendations: "Рекомендаций пока нет.",
    action: "Действие",
    conviction: "Уверенность",
    weight: "Вес в портфеле",
    disclaimer: "Дополнительная информация",
  },

  errors: {
    sessionNotCreated: "Сначала создайте сессию",
    streamingFailed: "Ошибка при трансляции",
    sessionCreateFailed: "Ошибка при создании сессии",
  },

  reasoningStepTypes: {
    MACRO: "Макроанализ",
    SECTOR: "Анализ сектора",
    COMPANY: "Анализ компании",
    FINAL: "Финальная рекомендация",
    macro_analysis: "Макроанализ",
    sector_analysis: "Анализ сектора",
    company_analysis: "Анализ компании",
    valuation: "Оценка стоимости",
    recommendation: "Рекомендация",
    risk_assessment: "Оценка рисков",
    analysis: "Анализ",
    evaluation: "Оценка",
    decision: "Решение",
  },

  recommendations: {
    actionBuy: "ПОКУПАТЬ",
    actionSell: "ПРОДАВАТЬ",
    actionHold: "ДЕРЖАТЬ",
    actionAccumulate: "НАКАПЛИВАТЬ",
    actionReduce: "СОКРАЩАТЬ",
    actionAvoid: "ИЗБЕГАТЬ",
    actionWatchlist: "НАБЛЮДЕНИЕ",
    convictionLow: "Низкая",
    convictionMedium: "Средняя",
    convictionHigh: "Высокая",
  },
} as const;

export type TranslationKeys = typeof ru;
