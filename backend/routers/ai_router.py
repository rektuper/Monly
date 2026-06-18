from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.dependencies import get_current_user
from services.categorization_service import categorize_for_transaction
import models

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


class CategorizeRequest(BaseModel):
    description: str = ""
    bank_category: str = ""
    transaction_type: str = "expense"


@router.post("/categorize")
def categorize_preview(
    payload: CategorizeRequest,
    current_user: models.User = Depends(get_current_user),
):
    return categorize_for_transaction(
        payload.description,
        payload.bank_category or None,
        payload.transaction_type,
    )


