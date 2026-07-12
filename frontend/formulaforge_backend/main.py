from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from .contracts import FormulaRequest, FormulaResponse, ModelMetadata, WorkbookPreview
from .download import apply_formula_to_workbook
from .model import FakeFormulaModel, FormulaModel, MLXFormulaModel
from .service import FormulaService
from .workbooks import normalize_workbook

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def build_service() -> FormulaService:
    model: FormulaModel
    if os.getenv("FORMULAFORGE_MODEL", "fake") == "mlx":
        model = MLXFormulaModel(
            os.environ["FORMULAFORGE_MODEL_PATH"], os.getenv("FORMULAFORGE_ADAPTER_PATH")
        )
    else:
        model = FakeFormulaModel()
    return FormulaService(model, float(os.getenv("FORMULAFORGE_INFERENCE_TIMEOUT", "2")))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.service = build_service()
    yield


app = FastAPI(title="FormulaForge API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def get_service(request: Request) -> FormulaService:
    return request.app.state.service  # type: ignore[no-any-return]


@app.exception_handler(HTTPException)
async def handled_http_error(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/api/v1/health")
async def health(service: Annotated[FormulaService, Depends(get_service)]) -> dict[str, bool]:
    return {"ready": service is not None}


@app.get("/api/v1/models", response_model=ModelMetadata)
async def models(service: Annotated[FormulaService, Depends(get_service)]) -> ModelMetadata:
    return ModelMetadata(
        model_id=service.model.model_id,
        adapter_version=service.model.adapter_version,
        ready=True,
        backend="mlx" if service.model.model_id.startswith("Qwen") else "fake",
    )


@app.post("/api/v1/workbooks/preview", response_model=WorkbookPreview)
async def preview_workbook(
    file: Annotated[UploadFile, File(...)], sheet_name: Annotated[str | None, Form()] = None
) -> WorkbookPreview:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(415, "Only .xlsx files are accepted")
    return normalize_workbook(await file.read(), sheet_name)


@app.post("/api/v1/formulas/generate", response_model=FormulaResponse)
async def generate_formula(
    payload: FormulaRequest, service: Annotated[FormulaService, Depends(get_service)]
) -> FormulaResponse:
    response = await service.generate(payload)
    return response


@app.post("/api/v1/workbooks/apply-formula")
async def apply_formula(
    file: Annotated[UploadFile, File(...)],
    sheet_name: Annotated[str, Form()],
    target_cell: Annotated[str, Form()],
    formula: Annotated[str, Form()],
) -> Response:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(415, "Only .xlsx files are accepted")
    modified = apply_formula_to_workbook(await file.read(), sheet_name, target_cell, formula)
    return Response(
        content=modified,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": 'attachment; filename="formulaforge-modified.xlsx"'},
    )
