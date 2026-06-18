from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from sqlalchemy.orm import Session

from sqlalchemy import func

from datetime import (
    datetime,
    timedelta
)

from database import SessionLocal

from core.dependencies import (
    get_current_user
)

from services.family_service import (
    get_family_member_user_ids,
    get_membership,
)

import models


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.get("/categories")
def category_analytics(

    period: str = Query("all"),

    date_from: datetime | None = Query(None),

    date_to: datetime | None = Query(None),

    db: Session = Depends(get_db),

    current_user: models.User = Depends(
        get_current_user
    )
):

    now = datetime.utcnow()

    start_date = None
    end_date = None

    if date_from and date_to:
        start_date = date_from.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        end_date = date_to.replace(
            hour=23,
            minute=59,
            second=59,
            microsecond=999999,
        )
    elif period == "day":

        start_date = (
            now - timedelta(days=1)
        )

    elif period == "week":

        start_date = (
            now - timedelta(days=7)
        )

    elif period == "month":

        start_date = (
            now - timedelta(days=30)
        )

    membership = get_membership(db, current_user.id)

    user_filter = models.Transaction.user_id == current_user.id

    if membership:
        member_ids = get_family_member_user_ids(
            db,
            membership.family_id,
        )
        user_filter = models.Transaction.user_id.in_(member_ids)

    query = (

        db.query(

            models.UserCategory.name.label(
                "category"
            ),

            func.sum(
                models.Transaction.amount
            ).label("total")
        )

        .join(
            models.UserCategory,

            models.Transaction.category_id
            ==
            models.UserCategory.id
        )

        .filter(

            user_filter,

            models.Transaction.is_deleted
            == False,

            models.Transaction.type
            == "expense",
        )
    )

    if start_date is not None:
        query = query.filter(
            models.Transaction.transaction_date
            >= start_date
        )

    if end_date is not None:
        query = query.filter(
            models.Transaction.transaction_date
            <= end_date
        )

    data = (
        query
        .group_by(
            models.UserCategory.name
        )
        .all()
    )

    return [

        {
            "category":
                item.category,

            "total":
                float(item.total),
        }

        for item in data
    ]