from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import SessionLocal
from core.dependencies import get_current_user
from ai.recommendations.engine import generate_recommendations
from ai.recommendations.family_engine import (
    generate_family_recommendations,
    calculate_family_forecast,
)
from ai.forecasting.simple_forecast import calculate_forecast
from ai.recommendations.merge import merge_recommendation_lists
from services.family_service import (
    get_membership,
    get_family_member_user_ids,
)
import schemas
import models

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[schemas.RecommendationResponse])
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = get_membership(db, current_user.id)

    if membership:
        family = (
            db.query(models.Family)
            .filter(models.Family.id == membership.family_id)
            .first()
        )

        if family:
            member_ids = get_family_member_user_ids(
                db,
                family.id,
            )
            family_recs = generate_family_recommendations(
                db,
                family,
                member_ids,
            )
            personal_recs = generate_recommendations(
                db,
                current_user.id,
                transaction_user_ids=member_ids,
                family_id=family.id,
            )
            personal_recs = [
                item
                for item in personal_recs
                if item.get("id") != "empty_data"
            ]
            return merge_recommendation_lists(
                family_recs,
                personal_recs,
                limit=10,
            )

    return generate_recommendations(db, current_user.id)


@router.get("/forecast", response_model=schemas.ForecastResponse)
def get_forecast(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = get_membership(db, current_user.id)

    if membership:
        family = (
            db.query(models.Family)
            .filter(models.Family.id == membership.family_id)
            .first()
        )

        if family:
            member_ids = get_family_member_user_ids(
                db,
                family.id,
            )
            return calculate_family_forecast(
                db,
                family,
                member_ids,
            )

    return calculate_forecast(db, current_user.id)
