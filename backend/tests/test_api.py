from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

from app.main import app


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_health(client: TestClient) -> None:
    assert client.get("/api/v1/health").json() == {"ready": True}


def test_generate_formula(client: TestClient) -> None:
    payload = {
        "task_type": "generate",
        "instruction": "sum",
        "sheet_name": "Sheet1",
        "target_cell": "B2",
        "cells": [{"address": "A1", "value": 2}, {"address": "A2", "value": 3}],
    }
    response = client.post("/api/v1/formulas/generate", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "valid"


def test_preview_workbook(client: TestClient) -> None:
    workbook = Workbook()
    workbook.active["A1"] = 7
    output = BytesIO()
    workbook.save(output)
    response = client.post(
        "/api/v1/workbooks/preview",
        files={
            "file": (
                "book.xlsx",
                output.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert response.status_code == 200
    assert response.json()["cells"] == [{"address": "A1", "value": 7}]
