from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class ProfileUpdate(BaseModel):
    last_name: Optional[str] = Field(None, min_length=1, max_length=80)
    first_name: Optional[str] = Field(None, min_length=1, max_length=80)
    middle_name: Optional[str] = Field(None, max_length=80)
    phone: Optional[str] = Field(None, max_length=32)


class UserProfileResponse(BaseModel):
    id: int
    name: str
    last_name: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    email: EmailStr
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
