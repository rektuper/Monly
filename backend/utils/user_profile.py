import models


def build_avatar_url(
    avatar_path: str | None,
    updated_at=None,
) -> str | None:
    if not avatar_path:
        return None

    url = f"/uploads/avatars/{avatar_path}"

    if updated_at is not None:
        version = (
            int(updated_at.timestamp())
            if hasattr(updated_at, "timestamp")
            else int(updated_at)
        )
        return f"{url}?v={version}"

    return url


def format_full_name(
    last_name: str | None,
    first_name: str | None,
    middle_name: str | None,
    fallback: str | None = None,
) -> str:
    parts = [
        (last_name or "").strip(),
        (first_name or "").strip(),
        (middle_name or "").strip(),
    ]
    parts = [part for part in parts if part]

    if parts:
        return " ".join(parts)

    return (fallback or "").strip()


def sync_user_display_name(user: models.User) -> None:
    user.name = format_full_name(
        user.last_name,
        user.first_name,
        user.middle_name,
        user.name,
    )


def split_legacy_name(name: str | None) -> tuple[str, str, str]:
    text = (name or "").strip()

    if not text:
        return "", "", ""

    parts = text.split()

    if len(parts) == 1:
        return "", parts[0], ""

    if len(parts) == 2:
        return parts[0], parts[1], ""

    return parts[0], parts[1], " ".join(parts[2:])


def serialize_user(user: models.User) -> dict:
    full_name = format_full_name(
        user.last_name,
        user.first_name,
        user.middle_name,
        user.name,
    )

    return {
        "id": user.id,
        "name": full_name,
        "last_name": user.last_name,
        "first_name": user.first_name,
        "middle_name": user.middle_name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "avatar_url": build_avatar_url(
            user.avatar_path,
            user.avatar_updated_at,
        ),
    }
