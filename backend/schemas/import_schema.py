from pydantic import BaseModel


class ImportPreviewStats(BaseModel):
    parsed_total: int
    duplicates_skipped: int
    new_count: int


class ImportPreviewResponse(BaseModel):
    transactions: list[dict]
    stats: ImportPreviewStats
