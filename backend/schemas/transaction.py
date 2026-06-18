from pydantic import BaseModel

from typing import Optional

from datetime import datetime


class CategoryResponse(BaseModel):

    id: int
    name: str

    class Config:
        from_attributes = True


class TransactionUserBrief(BaseModel):
    user_id: int
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    family_role: Optional[str] = None


class TransactionCreate(BaseModel):

    amount: float

    type: str

    category_id: int

    transaction_date: datetime

    description: Optional[str] = None

    payer_user_id: Optional[int] = None

    receiver_user_id: Optional[int] = None


class TransactionResponse(BaseModel):

    id: int

    amount: float

    type: str

    category_id: int

    category: CategoryResponse

    description: Optional[str]

    source: str

    transaction_date: datetime

    created_at: datetime

    bank_category: Optional[str] = None

    ai_confidence: Optional[float] = None

    ai_source: Optional[str] = None

    needs_review: bool = False

    family_id: Optional[int] = None

    created_by: Optional[TransactionUserBrief] = None

    payer: Optional[TransactionUserBrief] = None

    receiver: Optional[TransactionUserBrief] = None

    class Config:
        from_attributes = True


class TransactionUpdate(BaseModel):

    category_id: Optional[int] = None

    description: Optional[str] = None

    amount: Optional[float] = None

    type: Optional[str] = None

    payer_user_id: Optional[int] = None

    receiver_user_id: Optional[int] = None


class TransactionUpdateResult(BaseModel):

    transaction: TransactionResponse

    similar_updated_count: int = 0
