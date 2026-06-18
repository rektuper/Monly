from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


class UserCreate(BaseModel):
    last_name: str = Field(..., min_length=1, max_length=80)
    first_name: str = Field(..., min_length=1, max_length=80)
    middle_name: str | None = Field(None, max_length=80)
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    last_name: str | None = None
    first_name: str | None = None
    middle_name: str | None = None
    email: EmailStr
    role: str
    phone: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str