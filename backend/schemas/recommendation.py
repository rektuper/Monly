from pydantic import BaseModel
from typing import Optional


class RecommendationResponse(BaseModel):
    id: str
    type: str
    priority: str
    title: str
    message: str
    action: Optional[str] = None
    category: Optional[str] = None


class ForecastResponse(BaseModel):
    current_balance: float
    avg_daily_income: float
    avg_daily_expense: float
    projected_balance_30d: float
    projected_balance_month_end: float = 0.0
    savings_rate: float
    expense_trend: str = "stable"
    expense_trend_percent: float = 0.0
    income_trend: str = "stable"
    income_trend_percent: float = 0.0
    confidence: str = "low"
    expected_monthly_income: float = 0.0
    expected_monthly_expense: float = 0.0
    summary: str = ""
    is_family: bool = False
    currency: str = "RUB"
