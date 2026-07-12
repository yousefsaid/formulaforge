from __future__ import annotations

import json

from .contracts import FormulaRequest

SYSTEM_PROMPT = (
    "You generate Excel formulas. Return exactly one JSON object with one key, formula. "
    "The formula must begin with =. Do not explain."
)


def serialize_request(request: FormulaRequest) -> str:
    cells = sorted(
        request.cells,
        key=lambda cell: (int("".join(filter(str.isdigit, cell.address))), cell.address),
    )
    payload = {
        "sheet": request.sheet_name,
        "target_cell": request.target_cell,
        "instruction": request.instruction,
        "task_type": request.task_type.value,
        "cells": [{"address": c.address, "value": c.value} for c in cells],
    }
    if request.current_formula:
        payload["current_formula"] = request.current_formula
    if request.error_message:
        payload["error_message"] = request.error_message
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def chat_messages(request: FormulaRequest) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": serialize_request(request)},
    ]
