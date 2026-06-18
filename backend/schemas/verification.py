from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


class RegisterRequest(BaseModel):
    last_name: str = Field(..., min_length=1, max_length=80)
    first_name: str = Field(..., min_length=1, max_length=80)
    middle_name: str | None = Field(None, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendCodeRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(
        ...,
        pattern=r"^(registration|password_change)$",
    )


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)


class PasswordChangeConfirmRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16, max_length=256)
    password: str = Field(..., min_length=6, max_length=128)


class ResetPasswordValidateResponse(BaseModel):
    valid: bool
    email: EmailStr
    display_name: str


class ResetPasswordResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    message: str


class MessageResponse(BaseModel):
    message: str


class RegisterConfirmResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


from schemas.user import UserResponse  # noqa: E402

RegisterConfirmResponse.model_rebuild()
