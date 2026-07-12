from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskType(StrEnum):
    GENERATE = "generate"
    REPAIR = "repair"


class ResultStatus(StrEnum):
    VALID = "valid"
    INVALID = "invalid"
    ABSTAINED = "abstained"


class CellValue(BaseModel):
    model_config = ConfigDict(extra="forbid")
    address: str = Field(pattern=r"^[A-Z]{1,3}[1-9][0-9]*$")
    value: str | int | float | bool | None


class FormulaRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task_type: TaskType
    instruction: str = Field(min_length=1, max_length=1000)
    sheet_name: str = Field(min_length=1, max_length=100)
    target_cell: str = Field(pattern=r"^[A-Za-z]{1,3}[1-9][0-9]*$")
    cells: list[CellValue] = Field(min_length=1, max_length=5000)
    current_formula: str | None = Field(default=None, max_length=2048)
    error_message: str | None = Field(default=None, max_length=500)

    @field_validator("target_cell")
    @classmethod
    def uppercase_target(cls, value: str) -> str:
        return value.upper()


class FormulaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: str
    status: ResultStatus
    formula: str | None = None
    validation_errors: list[str] = Field(default_factory=list)
    preview_value: Any | None = None
    model_id: str
    adapter_version: str | None = None
    latency_ms: int = Field(ge=0)


class WorkbookPreview(BaseModel):
    sheets: list[str]
    selected_sheet: str
    cells: list[CellValue]
    non_empty_cell_count: int


class ModelMetadata(BaseModel):
    model_id: str
    adapter_version: str | None
    ready: bool
    backend: str
