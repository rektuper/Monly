from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FamilyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    currency: str = Field(default="RUB", min_length=3, max_length=3)
    initial_balance: float = Field(default=0.0, ge=0)
    family_role: str = Field(
        min_length=1,
        max_length=60,
        description="Ваша роль в семье, например: муж, жена",
    )


class FamilyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    initial_balance: Optional[float] = Field(None, ge=0)


class FamilyMemberRoleUpdate(BaseModel):
    family_role: str = Field(min_length=1, max_length=60)


class FamilyMemberPermissionUpdate(BaseModel):
    permission_role: str = Field(
        pattern="^(owner|participant|observer)$"
    )


class FamilyInviteAccept(BaseModel):
    family_role: str = Field(min_length=1, max_length=60)


class FamilyMemberResponse(BaseModel):
    user_id: int
    family_role: str
    permission_role: str
    joined_at: datetime
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[str] = None
    is_owner: bool = False


class FamilyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    currency: str
    initial_balance: float
    created_at: datetime
    created_by_user_id: int
    created_by_name: Optional[str] = None
    my_permission_role: Optional[str] = None
    members: list[FamilyMemberResponse]


class FamilyInviteCreateResponse(BaseModel):
    token: str
    access_code: str
    invite_url: str
    created_at: datetime


class FamilyInvitePreview(BaseModel):
    token: str
    access_code: Optional[str] = None
    family_name: str
    family_description: Optional[str] = None
    currency: str = "RUB"
    member_count: int
    created_at: datetime
    inviter: FamilyMemberResponse


class FamilyInviteAcceptResponse(BaseModel):
    message: str
    family: FamilyResponse
