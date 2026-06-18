from pydantic import BaseModel
from typing import Optional


class AdminDashboardStats(BaseModel):
    users_count: int
    transactions_count: int
    pending_review_count: int
    feedback_pending_count: int
    dataset_size: int


class AdminAiStatus(BaseModel):
    dataset_size: int
    feedback_count: int
    confidence_threshold: float
    auto_retrain_batch: int
    modules: list[str]


class AdminUserItem(BaseModel):
    id: int
    name: str
    email: str
    role: str
    transactions_count: int


class AdminUserRoleUpdate(BaseModel):
    role: str


class AdminFeedbackItem(BaseModel):
    text: str
    predicted_category: str
    correct_category: str
    source: str
    created_at: Optional[str] = None
