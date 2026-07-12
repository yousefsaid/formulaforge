from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from .contracts import FormulaRequest
from .prompting import chat_messages


class FormulaModel(Protocol):
    model_id: str
    adapter_version: str | None

    def generate(self, request: FormulaRequest) -> str | None: ...


def parse_formula_output(raw: str) -> str | None:
    candidates = [raw]
    found = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
    if found:
        candidates.append(found.group(0))
    for candidate in candidates:
        try:
            payload = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if set(payload) == {"formula"} and isinstance(payload["formula"], str):
            formula = payload["formula"].strip().upper()
            if formula.startswith("=") and "\n" not in formula:
                return formula
    return None


@dataclass
class FakeFormulaModel:
    response: str = '{"formula":"=SUM(A1:A2)"}'
    model_id: str = "fake/formula-model"
    adapter_version: str | None = "test"

    def generate(self, request: FormulaRequest) -> str | None:
        return parse_formula_output(self.response)


class MLXFormulaModel:
    """Lazy MLX-LM adapter; weights are explicitly provisioned outside server startup."""

    model_id = "Qwen/Qwen3-0.6B-4bit"

    def __init__(self, model_path: str, adapter_path: str | None = None) -> None:
        self.model_path = model_path
        self.adapter_path = adapter_path
        self.adapter_version = Path(adapter_path).name if adapter_path else None
        self._model: Any | None = None
        self._tokenizer: Any | None = None

    def _load(self) -> None:
        if self._model is not None:
            return
        try:
            from mlx_lm import load
        except ImportError as exc:
            raise RuntimeError("MLX-LM is not installed; use the fake model for tests") from exc
        self._model, self._tokenizer = load(self.model_path, adapter_path=self.adapter_path)

    def generate(self, request: FormulaRequest) -> str | None:
        self._load()
        from mlx_lm import generate

        tokenizer: Any = self._tokenizer
        prompt = tokenizer.apply_chat_template(
            chat_messages(request),
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )
        raw = generate(
            self._model, tokenizer, prompt=prompt, max_tokens=128, temp=0.0, verbose=False
        )
        return parse_formula_output(raw)
