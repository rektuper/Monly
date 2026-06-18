from sqlalchemy import inspect, text


USER_COLUMNS = {
    "phone": "VARCHAR",
    "avatar_path": "VARCHAR",
    "avatar_updated_at": "TIMESTAMP",
    "last_name": "VARCHAR",
    "first_name": "VARCHAR",
    "middle_name": "VARCHAR",
}


TRANSACTION_COLUMNS = {
    "bank_category": "VARCHAR",
    "ai_confidence": "FLOAT",
    "ai_source": "VARCHAR",
    "needs_review": "BOOLEAN DEFAULT FALSE",
}


def run_migrations(engine):
    inspector = inspect(engine)

    if "users" in inspector.get_table_names():
        existing = {
            col["name"]
            for col in inspector.get_columns("users")
        }

        with engine.begin() as conn:
            for name, col_type in USER_COLUMNS.items():
                if name not in existing:
                    conn.execute(
                        text(
                            f"ALTER TABLE users "
                            f"ADD COLUMN {name} {col_type}"
                        )
                    )

        _backfill_user_name_parts(engine)
        _backfill_avatar_updated_at(engine)

    if "transactions" in inspector.get_table_names():
        existing = {
            col["name"]
            for col in inspector.get_columns("transactions")
        }

        with engine.begin() as conn:
            for name, col_type in TRANSACTION_COLUMNS.items():
                if name not in existing:
                    conn.execute(
                        text(
                            f"ALTER TABLE transactions "
                            f"ADD COLUMN {name} {col_type}"
                        )
                    )

    _ensure_table_exists(engine, inspector, "financial_goals")
    _ensure_table_exists(engine, inspector, "category_budgets")
    _ensure_table_exists(engine, inspector, "families")
    _ensure_table_exists(engine, inspector, "family_members")
    _ensure_table_exists(engine, inspector, "family_invites")
    _ensure_table_exists(engine, inspector, "email_verifications")

    _migrate_financial_goals_columns(engine, inspector)
    _migrate_transactions_family(engine, inspector)
    _migrate_family_budget_columns(engine, inspector)
    _migrate_family_member_permissions(engine, inspector)
    _migrate_family_invite_codes(engine, inspector)
    _migrate_transaction_participants(engine, inspector)


GOAL_COLUMNS = {
    "family_id": "INTEGER",
    "created_by_user_id": "INTEGER",
}

TRANSACTION_FAMILY_COLUMNS = {
    "family_id": "INTEGER",
}


def _migrate_financial_goals_columns(engine, inspector):
    if "financial_goals" not in inspector.get_table_names():
        return

    existing = {
        col["name"]
        for col in inspector.get_columns("financial_goals")
    }

    with engine.begin() as conn:
        for name, col_type in GOAL_COLUMNS.items():
            if name not in existing:
                conn.execute(
                    text(
                        f"ALTER TABLE financial_goals "
                        f"ADD COLUMN {name} {col_type}"
                    )
                )

        conn.execute(
            text(
                "UPDATE financial_goals "
                "SET created_by_user_id = user_id "
                "WHERE created_by_user_id IS NULL"
            )
        )


def _migrate_transactions_family(engine, inspector):
    if "transactions" not in inspector.get_table_names():
        return

    existing = {
        col["name"]
        for col in inspector.get_columns("transactions")
    }

    with engine.begin() as conn:
        for name, col_type in TRANSACTION_FAMILY_COLUMNS.items():
            if name not in existing:
                conn.execute(
                    text(
                        f"ALTER TABLE transactions "
                        f"ADD COLUMN {name} {col_type}"
                    )
                )


def _migrate_family_budget_columns(engine, inspector):
    if "families" not in inspector.get_table_names():
        return

    columns = {
        "description": "VARCHAR",
        "currency": "VARCHAR DEFAULT 'RUB'",
        "initial_balance": "FLOAT DEFAULT 0",
    }

    existing = {
        col["name"]
        for col in inspector.get_columns("families")
    }

    with engine.begin() as conn:
        for name, col_type in columns.items():
            if name not in existing:
                conn.execute(
                    text(
                        f"ALTER TABLE families "
                        f"ADD COLUMN {name} {col_type}"
                    )
                )


def _migrate_family_member_permissions(engine, inspector):
    if "family_members" not in inspector.get_table_names():
        return

    existing = {
        col["name"]
        for col in inspector.get_columns("family_members")
    }

    with engine.begin() as conn:
        if "permission_role" not in existing:
            conn.execute(
                text(
                    "ALTER TABLE family_members "
                    "ADD COLUMN permission_role VARCHAR "
                    "DEFAULT 'participant'"
                )
            )

        conn.execute(
            text(
                "UPDATE family_members "
                "SET permission_role = 'owner' "
                "WHERE permission_role IS NULL "
                "OR permission_role = 'participant' "
                "AND user_id IN ("
                "  SELECT created_by_user_id FROM families "
                "  WHERE families.id = family_members.family_id"
                ")"
            )
        )

        conn.execute(
            text(
                "UPDATE family_members "
                "SET permission_role = 'participant' "
                "WHERE permission_role IS NULL"
            )
        )


def _migrate_family_invite_codes(engine, inspector):
    if "family_invites" not in inspector.get_table_names():
        return

    existing = {
        col["name"]
        for col in inspector.get_columns("family_invites")
    }

    if "access_code" in existing:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE family_invites "
                "ADD COLUMN access_code VARCHAR"
            )
        )

        rows = conn.execute(
            text("SELECT id FROM family_invites")
        ).fetchall()

        used = set()
        for row in rows:
            while True:
                code = _generate_migration_code()
                if code not in used:
                    used.add(code)
                    break

            conn.execute(
                text(
                    "UPDATE family_invites "
                    "SET access_code = :code "
                    "WHERE id = :id"
                ),
                {"code": code, "id": row.id},
            )


def _generate_migration_code() -> str:
    import secrets
    import string

    alphabet = (
        string.ascii_uppercase.replace("O", "").replace("I", "")
        + string.digits.replace("0", "").replace("1", "")
    )
    return "".join(
        secrets.choice(alphabet)
        for _ in range(6)
    )


def _migrate_transaction_participants(engine, inspector):
    if "transactions" not in inspector.get_table_names():
        return

    columns = {
        "created_by_user_id": "INTEGER",
        "payer_user_id": "INTEGER",
        "receiver_user_id": "INTEGER",
    }

    existing = {
        col["name"]
        for col in inspector.get_columns("transactions")
    }

    with engine.begin() as conn:
        for name, col_type in columns.items():
            if name not in existing:
                conn.execute(
                    text(
                        f"ALTER TABLE transactions "
                        f"ADD COLUMN {name} {col_type}"
                    )
                )

        conn.execute(
            text(
                "UPDATE transactions "
                "SET created_by_user_id = user_id "
                "WHERE created_by_user_id IS NULL"
            )
        )

        conn.execute(
            text(
                "UPDATE transactions "
                "SET payer_user_id = user_id "
                "WHERE payer_user_id IS NULL "
                "AND type = 'expense'"
            )
        )

        conn.execute(
            text(
                "UPDATE transactions "
                "SET receiver_user_id = user_id "
                "WHERE receiver_user_id IS NULL "
                "AND type = 'income'"
            )
        )


def _backfill_avatar_updated_at(engine):
    from datetime import datetime, timezone
    from pathlib import Path

    avatar_dir = (
        Path(__file__).resolve().parent.parent
        / "uploads"
        / "avatars"
    )

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                "SELECT id, avatar_path, avatar_updated_at "
                "FROM users "
                "WHERE avatar_path IS NOT NULL"
            )
        ).fetchall()

        for row in rows:
            if row.avatar_updated_at:
                continue

            file_path = avatar_dir / row.avatar_path

            if not file_path.is_file():
                continue

            updated_at = datetime.fromtimestamp(
                file_path.stat().st_mtime,
                tz=timezone.utc,
            )

            conn.execute(
                text(
                    "UPDATE users "
                    "SET avatar_updated_at = :updated_at "
                    "WHERE id = :id"
                ),
                {
                    "id": row.id,
                    "updated_at": updated_at,
                },
            )


def _backfill_user_name_parts(engine):
    from utils.user_profile import (
        split_legacy_name,
        format_full_name,
    )

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                "SELECT id, name, last_name, first_name, middle_name "
                "FROM users"
            )
        ).fetchall()

        for row in rows:
            last_name = row.last_name
            first_name = row.first_name
            middle_name = row.middle_name

            if last_name or first_name:
                continue

            if not row.name:
                continue

            if not last_name and not first_name and row.name:
                last_name, first_name, middle_name = (
                    split_legacy_name(row.name)
                )

            full_name = format_full_name(
                last_name,
                first_name,
                middle_name,
                row.name,
            )

            conn.execute(
                text(
                    "UPDATE users SET "
                    "last_name = :last_name, "
                    "first_name = :first_name, "
                    "middle_name = :middle_name, "
                    "name = :name "
                    "WHERE id = :id"
                ),
                {
                    "id": row.id,
                    "last_name": last_name or None,
                    "first_name": first_name or None,
                    "middle_name": middle_name or None,
                    "name": full_name or row.name,
                },
            )


def _ensure_table_exists(engine, inspector, table_name):
    if table_name not in inspector.get_table_names():
        return

