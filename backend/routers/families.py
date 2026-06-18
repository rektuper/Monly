from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from core.dependencies import get_current_user
from models.family import (
    FamilyInvite,
    PERMISSION_OWNER,
    PERMISSION_PARTICIPANT,
    generate_access_code,
    generate_invite_token,
)
import models
import schemas
from services.family_service import (
    build_invite_url,
    cleanup_and_delete_family,
    count_family_owners,
    get_membership,
    require_membership,
    require_owner,
    serialize_family,
    serialize_member,
)

router = APIRouter(
    prefix="/families",
    tags=["Families"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_family_or_404(db: Session, family_id: int):
    family = (
        db.query(models.Family)
        .filter(models.Family.id == family_id)
        .first()
    )

    if not family:
        raise HTTPException(
            status_code=404,
            detail="Family not found",
        )

    return family


def _build_invite_preview(
    db: Session,
    invite: FamilyInvite,
    include_code: bool = False,
) -> dict:
    family = _get_family_or_404(db, invite.family_id)

    inviter_member = (
        db.query(models.FamilyMember)
        .filter(
            models.FamilyMember.family_id == family.id,
            models.FamilyMember.user_id == invite.created_by_user_id,
        )
        .first()
    )

    if not inviter_member:
        inviter_member = models.FamilyMember(
            family_id=family.id,
            user_id=invite.created_by_user_id,
            family_role="участник",
            permission_role=PERMISSION_PARTICIPANT,
        )

    member_count = (
        db.query(models.FamilyMember)
        .filter(models.FamilyMember.family_id == family.id)
        .count()
    )

    payload = {
        "token": invite.token,
        "family_name": family.name,
        "family_description": family.description,
        "currency": family.currency or "RUB",
        "member_count": member_count,
        "created_at": invite.created_at,
        "inviter": serialize_member(db, inviter_member),
    }

    if include_code:
        payload["access_code"] = invite.access_code

    return payload


@router.get("/me", response_model=schemas.FamilyResponse)
def get_my_family(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = get_membership(db, current_user.id)

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Family not found",
        )

    family = _get_family_or_404(db, membership.family_id)

    return serialize_family(
        db,
        family,
        current_user.id,
    )


@router.post("", response_model=schemas.FamilyResponse)
def create_family(
    payload: schemas.FamilyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if get_membership(db, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="You are already in a family group",
        )

    family = models.Family(
        name=payload.name.strip(),
        description=(payload.description or "").strip() or None,
        currency=payload.currency.upper(),
        initial_balance=payload.initial_balance,
        created_by_user_id=current_user.id,
    )
    db.add(family)
    db.flush()

    member = models.FamilyMember(
        family_id=family.id,
        user_id=current_user.id,
        family_role=payload.family_role.strip(),
        permission_role=PERMISSION_OWNER,
    )
    db.add(member)
    db.commit()
    db.refresh(family)

    return serialize_family(
        db,
        family,
        current_user.id,
    )


@router.patch("/me", response_model=schemas.FamilyResponse)
def update_my_family(
    payload: schemas.FamilyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = require_owner(db, current_user.id)
    family = _get_family_or_404(db, membership.family_id)

    if payload.name is not None:
        family.name = payload.name.strip()

    if payload.description is not None:
        family.description = payload.description.strip() or None

    if payload.currency is not None:
        family.currency = payload.currency.upper()

    if payload.initial_balance is not None:
        family.initial_balance = payload.initial_balance

    db.commit()
    db.refresh(family)

    return serialize_family(
        db,
        family,
        current_user.id,
    )


@router.patch(
    "/me/members/me",
    response_model=schemas.FamilyMemberResponse,
)
def update_my_family_role(
    payload: schemas.FamilyMemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = require_membership(db, current_user.id)
    membership.family_role = payload.family_role.strip()
    db.commit()
    db.refresh(membership)

    return serialize_member(db, membership)


@router.patch(
    "/me/members/{user_id}",
    response_model=schemas.FamilyMemberResponse,
)
def update_member_permission(
    user_id: int,
    payload: schemas.FamilyMemberPermissionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = require_owner(db, current_user.id)

    target = (
        db.query(models.FamilyMember)
        .filter(
            models.FamilyMember.family_id == membership.family_id,
            models.FamilyMember.user_id == user_id,
        )
        .first()
    )

    if not target:
        raise HTTPException(
            status_code=404,
            detail="Member not found",
        )

    if target.user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own permission role",
        )

    if (
        target.permission_role == PERMISSION_OWNER
        and payload.permission_role != PERMISSION_OWNER
    ):
        owners = (
            db.query(models.FamilyMember)
            .filter(
                models.FamilyMember.family_id == membership.family_id,
                models.FamilyMember.permission_role == PERMISSION_OWNER,
            )
            .count()
        )

        if owners <= 1:
            raise HTTPException(
                status_code=400,
                detail="Budget must have at least one owner",
            )

    target.permission_role = payload.permission_role
    db.commit()
    db.refresh(target)

    return serialize_member(db, target)


@router.delete("/me/members/{user_id}")
def remove_member(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = require_owner(db, current_user.id)

    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Use leave endpoint to exit the budget",
        )

    target = (
        db.query(models.FamilyMember)
        .filter(
            models.FamilyMember.family_id == membership.family_id,
            models.FamilyMember.user_id == user_id,
        )
        .first()
    )

    if not target:
        raise HTTPException(
            status_code=404,
            detail="Member not found",
        )

    db.delete(target)
    db.commit()

    return {"message": "Member removed"}


@router.post(
    "/invites",
    response_model=schemas.FamilyInviteCreateResponse,
)
def create_family_invite(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = require_owner(db, current_user.id)

    invite = FamilyInvite(
        family_id=membership.family_id,
        token=generate_invite_token(),
        access_code=generate_access_code(),
        created_by_user_id=current_user.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    return {
        "token": invite.token,
        "access_code": invite.access_code,
        "invite_url": build_invite_url(invite.token),
        "created_at": invite.created_at,
    }


@router.get(
    "/invites/{token}",
    response_model=schemas.FamilyInvitePreview,
)
def preview_family_invite(
    token: str,
    db: Session = Depends(get_db),
):
    invite = (
        db.query(FamilyInvite)
        .filter(FamilyInvite.token == token)
        .first()
    )

    if not invite:
        raise HTTPException(
            status_code=404,
            detail="Invite not found",
        )

    return _build_invite_preview(db, invite)


@router.get(
    "/invites/code/{code}",
    response_model=schemas.FamilyInvitePreview,
)
def preview_family_invite_by_code(
    code: str,
    db: Session = Depends(get_db),
):
    invite = (
        db.query(FamilyInvite)
        .filter(
            FamilyInvite.access_code == code.upper().strip()
        )
        .first()
    )

    if not invite:
        raise HTTPException(
            status_code=404,
            detail="Invite not found",
        )

    return _build_invite_preview(db, invite, include_code=True)


def _accept_invite(
    db: Session,
    invite: FamilyInvite,
    current_user: models.User,
    family_role: str,
) -> dict:
    if get_membership(db, current_user.id):
        raise HTTPException(
            status_code=400,
            detail="Leave your current family before joining another",
        )

    family = _get_family_or_404(db, invite.family_id)

    member = models.FamilyMember(
        family_id=family.id,
        user_id=current_user.id,
        family_role=family_role.strip(),
        permission_role=PERMISSION_PARTICIPANT,
    )
    db.add(member)
    db.commit()
    db.refresh(family)

    return {
        "message": "Joined family group",
        "family": serialize_family(
            db,
            family,
            current_user.id,
        ),
    }


@router.post(
    "/invites/{token}/accept",
    response_model=schemas.FamilyInviteAcceptResponse,
)
def accept_family_invite(
    token: str,
    payload: schemas.FamilyInviteAccept,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    invite = (
        db.query(FamilyInvite)
        .filter(FamilyInvite.token == token)
        .first()
    )

    if not invite:
        raise HTTPException(
            status_code=404,
            detail="Invite not found",
        )

    return _accept_invite(
        db,
        invite,
        current_user,
        payload.family_role,
    )


@router.post(
    "/invites/code/{code}/accept",
    response_model=schemas.FamilyInviteAcceptResponse,
)
def accept_family_invite_by_code(
    code: str,
    payload: schemas.FamilyInviteAccept,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    invite = (
        db.query(FamilyInvite)
        .filter(
            FamilyInvite.access_code == code.upper().strip()
        )
        .first()
    )

    if not invite:
        raise HTTPException(
            status_code=404,
            detail="Invite not found",
        )

    return _accept_invite(
        db,
        invite,
        current_user,
        payload.family_role,
    )


@router.post("/me/leave")
def leave_family(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = require_membership(db, current_user.id)

    family = _get_family_or_404(db, membership.family_id)

    member_count = (
        db.query(models.FamilyMember)
        .filter(
            models.FamilyMember.family_id == family.id,
        )
        .count()
    )

    if (
        membership.permission_role == PERMISSION_OWNER
        and member_count > 1
        and count_family_owners(db, family.id) <= 1
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Transfer ownership to another member "
                "before leaving the budget"
            ),
        )

    db.delete(membership)

    if member_count <= 1:
        cleanup_and_delete_family(db, family)

    db.commit()

    if member_count <= 1:
        return {"message": "Family group deleted"}

    return {"message": "Left family group"}


@router.delete("/me")
def delete_my_family(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = require_owner(db, current_user.id)
    family = _get_family_or_404(db, membership.family_id)

    member_count = (
        db.query(models.FamilyMember)
        .filter(models.FamilyMember.family_id == family.id)
        .count()
    )

    if member_count > 1:
        raise HTTPException(
            status_code=400,
            detail=(
                "Remove all members or transfer ownership "
                "before deleting the budget"
            ),
        )

    cleanup_and_delete_family(db, family)
    db.commit()

    return {"message": "Family group deleted"}
