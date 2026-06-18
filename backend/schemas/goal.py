from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GoalCreate(BaseModel):
    title: str
    target_amount: float
    current_amount: float = 0
    deadline: Optional[datetime] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[datetime] = None
    is_completed: Optional[bool] = None


class GoalCreatorResponse(BaseModel):
    user_id: int
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    family_role: Optional[str] = None


class GoalResponse(BaseModel):
    id: int
    title: str
    target_amount: float
    current_amount: float
    deadline: Optional[datetime]
    is_completed: bool
    created_at: datetime
    family_id: Optional[int] = None
    created_by: Optional[GoalCreatorResponse] = None
    is_mine: bool = True

    class Config:
        from_attributes = True


class CategoryBudgetCreate(BaseModel):
    category_id: int
    monthly_limit: float


class CategoryBudgetResponse(BaseModel):
    id: int
    category_id: int
    monthly_limit: float
    category_name: Optional[str] = None

    class Config:
        from_attributes = True
