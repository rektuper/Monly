from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy.orm import Session

from database import SessionLocal

from core.dependencies import (
    get_current_user
)

from utils.categories import (
    get_or_create_category,
)

import models
import schemas


router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.get(
    "",
    response_model=list[
        schemas.CategoryResponse
    ]
)
def get_categories(
    db: Session = Depends(get_db),

    current_user: models.User = Depends(
        get_current_user
    )
):

    categories = (
        db.query(models.UserCategory)

        .filter(
            models.UserCategory.user_id
            == current_user.id
        )

        .all()
    )

    return categories


@router.post(
    "",
    response_model=schemas.CategoryResponse,
)
def create_category(
    body: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    ),
):
    return get_or_create_category(
        db,
        current_user,
        body.name.strip(),
        body.type,
    )