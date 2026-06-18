from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str
    type: str
