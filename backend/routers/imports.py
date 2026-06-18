from io import BytesIO

import logging

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException,
    Body,
)

from sqlalchemy.orm import Session

import pandas as pd

from database import SessionLocal

from core.dependencies import (
    get_current_user
)

from utils.fingerprint import (
    generate_fingerprint
)

from schemas.import_schema import ImportPreviewResponse, ImportPreviewStats

from parsers.sber_parser import (
    parse_sber_pdf
)

from utils.categories import (
    apply_ai_categorization,
    get_or_create_category,
)
from services.family_service import get_membership

import models

logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 10 * 1024 * 1024


router = APIRouter(
    prefix="/imports",
    tags=["Imports"]
)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


def enrich_transaction_with_ai(
    db,
    current_user,
    transaction,
):
    bank_category = transaction.get("category")
    description = transaction.get("description") or ""

    category, ai = apply_ai_categorization(
        db=db,
        current_user=current_user,
        description=description,
        bank_category=bank_category,
        transaction_type=transaction["type"],
        use_ml=False,
    )

    return {
        **transaction,
        "category": ai["category"],
        "bank_category": bank_category,
        "ai_confidence": ai["confidence"],
        "ai_source": ai["source"],
        "needs_review": ai["needs_review"],
        "category_id": category.id,
    }


def _build_transaction_fingerprint(transaction: dict) -> str:
    return generate_fingerprint(
        amount=transaction["amount"],
        description=transaction.get("description") or "",
        transaction_date=transaction["transaction_date"],
        transaction_type=transaction["type"],
    )


def _filter_new_transactions(
    db: Session,
    user_id: int,
    transactions: list[dict],
) -> tuple[list[dict], int]:
    new_transactions = []
    duplicates_skipped = 0

    for transaction in transactions:
        fingerprint = _build_transaction_fingerprint(transaction)

        existing_transaction = (
            db.query(models.Transaction)
            .filter(
                models.Transaction.user_id == user_id,
                models.Transaction.fingerprint == fingerprint,
            )
            .first()
        )

        if existing_transaction:
            duplicates_skipped += 1
            continue

        new_transactions.append(transaction)

    return new_transactions, duplicates_skipped


@router.post("/save")
async def save_imported_transactions(

    transactions: list = Body(...),

    db: Session = Depends(get_db),

    current_user: models.User = Depends(
        get_current_user
    )
):

    saved_count = 0
    membership = get_membership(db, current_user.id)

    for transaction in transactions:

        bank_category = transaction.get("bank_category") or transaction.get("category")

        category, ai = apply_ai_categorization(
            db,
            current_user,
            transaction.get("description"),
            bank_category,
            transaction["type"],
            use_ml=False,
        )

        if transaction.get("category_id"):
            user_category = (
                db.query(models.UserCategory)
                .filter(
                    models.UserCategory.id == transaction["category_id"],
                    models.UserCategory.user_id == current_user.id,
                )
                .first()
            )
            if user_category:
                category = user_category
                ai = {
                    "confidence": transaction.get("ai_confidence", ai["confidence"]),
                    "source": transaction.get("ai_source", ai["source"]),
                    "needs_review": transaction.get("needs_review", ai["needs_review"]),
                }

        fingerprint = (
            generate_fingerprint(

                amount=
                    transaction["amount"],

                description=
                    transaction.get("description") or "",

                transaction_date=
                    transaction[
                        "transaction_date"
                    ],

                transaction_type=
                    transaction["type"],
            )
        )

        existing_transaction = (

            db.query(
                models.Transaction
            )

            .filter(
                models.Transaction.user_id
                == current_user.id,
                models.Transaction.fingerprint
                == fingerprint,
            )

            .first()
        )

        if existing_transaction:
            continue

        new_transaction = (
            models.Transaction(

                user_id=current_user.id,

                created_by_user_id=current_user.id,

                payer_user_id=(
                    current_user.id
                    if transaction["type"] == "expense"
                    else None
                ),

                receiver_user_id=(
                    current_user.id
                    if transaction["type"] == "income"
                    else None
                ),

                family_id=membership.family_id if membership else None,

                amount=transaction["amount"],

                type=transaction["type"],

                category_id=
                    category.id,

                description=
                    transaction.get("description"),

                transaction_date=
                    transaction[
                        "transaction_date"
                    ],

                source="import",

                fingerprint=
                    fingerprint,

                bank_category=bank_category,

                ai_confidence=ai["confidence"],

                ai_source=ai["source"],

                needs_review=ai["needs_review"],
            )
        )

        db.add(new_transaction)

        saved_count += 1

    db.commit()

    return {

        "message":
            "Transactions saved",

        "count":
            saved_count,
    }


@router.post("/csv")
async def import_csv(

    file: UploadFile = File(...),

    db: Session = Depends(get_db),

    current_user: models.User = Depends(
        get_current_user
    )
):

    if not file.filename.endswith(".csv"):

        raise HTTPException(
            status_code=400,
            detail="Only CSV files allowed"
        )

    df = pd.read_csv(file.file)

    imported_transactions = []
    membership = get_membership(db, current_user.id)

    for _, row in df.iterrows():

        try:

            amount = float(
                row["amount"]
            )

            description = str(
                row["description"]
            )

            transaction_date = (
                pd.to_datetime(
                    row["date"]
                )
            )

            transaction_type = (
                "income"
                if amount > 0
                else "expense"
            )

            category, ai = apply_ai_categorization(
                db,
                current_user,
                description,
                None,
                transaction_type,
                use_ml=False,
            )

            fingerprint = (
                generate_fingerprint(

                    amount=abs(amount),

                    description=description,

                    transaction_date=
                        transaction_date,

                    transaction_type=
                        transaction_type,
                )
            )

            existing_transaction = (

                db.query(
                    models.Transaction
                )

                .filter(
                    models.Transaction.user_id
                    == current_user.id,
                    models.Transaction.fingerprint
                    == fingerprint,
                )

                .first()
            )

            if existing_transaction:
                continue

            new_transaction = (
                models.Transaction(

                    user_id=current_user.id,

                    created_by_user_id=current_user.id,

                    payer_user_id=(
                        current_user.id
                        if transaction_type == "expense"
                        else None
                    ),

                    receiver_user_id=(
                        current_user.id
                        if transaction_type == "income"
                        else None
                    ),

                    family_id=membership.family_id if membership else None,

                    amount=abs(amount),

                    type=transaction_type,

                    category_id=
                        category.id,

                    description=
                        description,

                    transaction_date=
                        transaction_date,

                    source="csv_import",

                    fingerprint=
                        fingerprint,

                    ai_confidence=ai["confidence"],

                    ai_source=ai["source"],

                    needs_review=ai["needs_review"],
                )
            )

            db.add(new_transaction)

            imported_transactions.append({

                "amount": amount,

                "description":
                    description,
            })

        except Exception as e:

            print(e)

    db.commit()

    return {

        "message":
            "Transactions imported",

        "count":
            len(imported_transactions),
    }


@router.post("/sber-preview", response_model=ImportPreviewResponse)
async def sber_preview(
    file: UploadFile = File(...),

    db: Session = Depends(get_db),

    current_user: models.User = Depends(
        get_current_user
    ),
):

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF allowed",
        )

    content = await file.read()

    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=400,
            detail="PDF file is too large (max 10 MB)",
        )

    try:
        transactions = parse_sber_pdf(
            BytesIO(content)
        )
    except Exception as exc:
        logger.exception("Failed to parse Sber PDF: %s", exc)
        raise HTTPException(
            status_code=400,
            detail="Could not parse bank statement PDF",
        ) from exc

    parsed_total = len(transactions)

    if parsed_total == 0:
        raise HTTPException(
            status_code=422,
            detail="No transactions found in statement",
        )

    new_transactions, duplicates_skipped = (
        _filter_new_transactions(
            db,
            current_user.id,
            transactions,
        )
    )

    enriched = []

    for transaction in new_transactions:
        enriched.append(
            enrich_transaction_with_ai(
                db,
                current_user,
                transaction,
            )
        )

    return {
        "transactions": enriched,
        "stats": {
            "parsed_total": parsed_total,
            "duplicates_skipped": duplicates_skipped,
            "new_count": len(enriched),
        },
    }
