from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session



from database import SessionLocal

from core.dependencies import get_current_user

from services.family_service import (

    can_access_goal,

    get_membership,

    serialize_goal,

)

import schemas

import models



router = APIRouter(

    prefix="/goals",

    tags=["Goals"],

)





def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()





@router.get("", response_model=list[schemas.GoalResponse])

def list_goals(

    db: Session = Depends(get_db),

    current_user: models.User = Depends(get_current_user),

):

    membership = get_membership(db, current_user.id)



    if membership:

        goals = (

            db.query(models.FinancialGoal)

            .filter(

                models.FinancialGoal.family_id

                == membership.family_id,

            )

            .order_by(models.FinancialGoal.created_at.desc())

            .all()

        )

    else:

        goals = (

            db.query(models.FinancialGoal)

            .filter(

                models.FinancialGoal.user_id == current_user.id,

                models.FinancialGoal.family_id.is_(None),

            )

            .order_by(models.FinancialGoal.created_at.desc())

            .all()

        )



    return [
        serialize_goal(
            db,
            goal,
            membership,
            current_user.id,
        )
        for goal in goals
    ]





@router.post("", response_model=schemas.GoalResponse)

def create_goal(

    goal: schemas.GoalCreate,

    db: Session = Depends(get_db),

    current_user: models.User = Depends(get_current_user),

):

    membership = get_membership(db, current_user.id)



    new_goal = models.FinancialGoal(

        user_id=current_user.id,

        created_by_user_id=current_user.id,

        family_id=membership.family_id if membership else None,

        title=goal.title,

        target_amount=goal.target_amount,

        current_amount=goal.current_amount,

        deadline=goal.deadline,

    )

    if float(new_goal.current_amount) >= float(new_goal.target_amount):
        new_goal.current_amount = float(new_goal.target_amount)
        new_goal.is_completed = True

    db.add(new_goal)

    db.commit()

    db.refresh(new_goal)



    return serialize_goal(
        db,
        new_goal,
        membership,
        current_user.id,
    )





@router.get("/budgets", response_model=list[schemas.CategoryBudgetResponse])

def list_budgets(

    db: Session = Depends(get_db),

    current_user: models.User = Depends(get_current_user),

):

    budgets = (

        db.query(models.CategoryBudget)

        .filter(models.CategoryBudget.user_id == current_user.id)

        .all()

    )



    result = []

    for budget in budgets:

        category = (

            db.query(models.UserCategory)

            .filter(models.UserCategory.id == budget.category_id)

            .first()

        )

        result.append({

            "id": budget.id,

            "category_id": budget.category_id,

            "monthly_limit": budget.monthly_limit,

            "category_name": category.name if category else None,

        })



    return result





@router.post("/budgets", response_model=schemas.CategoryBudgetResponse)

def create_budget(

    payload: schemas.CategoryBudgetCreate,

    db: Session = Depends(get_db),

    current_user: models.User = Depends(get_current_user),

):

    category = (

        db.query(models.UserCategory)

        .filter(

            models.UserCategory.id == payload.category_id,

            models.UserCategory.user_id == current_user.id,

        )

        .first()

    )



    if not category:

        raise HTTPException(status_code=404, detail="Category not found")



    existing = (

        db.query(models.CategoryBudget)

        .filter(

            models.CategoryBudget.user_id == current_user.id,

            models.CategoryBudget.category_id == payload.category_id,

        )

        .first()

    )



    if existing:

        existing.monthly_limit = payload.monthly_limit

        db.commit()

        db.refresh(existing)

        return {

            "id": existing.id,

            "category_id": existing.category_id,

            "monthly_limit": existing.monthly_limit,

            "category_name": category.name,

        }



    budget = models.CategoryBudget(

        user_id=current_user.id,

        category_id=payload.category_id,

        monthly_limit=payload.monthly_limit,

    )

    db.add(budget)

    db.commit()

    db.refresh(budget)



    return {

        "id": budget.id,

        "category_id": budget.category_id,

        "monthly_limit": budget.monthly_limit,

        "category_name": category.name,

    }





@router.patch("/{goal_id}", response_model=schemas.GoalResponse)

def update_goal(

    goal_id: int,

    data: schemas.GoalUpdate,

    db: Session = Depends(get_db),

    current_user: models.User = Depends(get_current_user),

):

    membership = get_membership(db, current_user.id)



    goal = (

        db.query(models.FinancialGoal)

        .filter(models.FinancialGoal.id == goal_id)

        .first()

    )



    if not goal or not can_access_goal(

        goal,

        current_user.id,

        membership,

    ):

        raise HTTPException(status_code=404, detail="Goal not found")



    for field, value in data.model_dump(exclude_unset=True).items():

        setattr(goal, field, value)

    if float(goal.current_amount) >= float(goal.target_amount):
        goal.current_amount = float(goal.target_amount)
        goal.is_completed = True
    elif goal.is_completed and float(goal.current_amount) < float(goal.target_amount):
        goal.is_completed = False

    db.commit()

    db.refresh(goal)



    return serialize_goal(
        db,
        goal,
        membership,
        current_user.id,
    )





@router.delete("/{goal_id}")

def delete_goal(

    goal_id: int,

    db: Session = Depends(get_db),

    current_user: models.User = Depends(get_current_user),

):

    membership = get_membership(db, current_user.id)



    goal = (

        db.query(models.FinancialGoal)

        .filter(models.FinancialGoal.id == goal_id)

        .first()

    )



    if not goal or not can_access_goal(

        goal,

        current_user.id,

        membership,

    ):

        raise HTTPException(status_code=404, detail="Goal not found")



    db.delete(goal)

    db.commit()

    return {"message": "Goal deleted"}


