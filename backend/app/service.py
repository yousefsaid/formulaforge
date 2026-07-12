from __future__ import annotations

import hashlib
import time
import uuid
from asyncio import Semaphore, wait_for

from .cache import LruCache
from .contracts import FormulaRequest, FormulaResponse, ResultStatus
from .evaluator import validate_and_evaluate
from .model import FormulaModel
from .prompting import serialize_request


class FormulaService:
    def __init__(self, model: FormulaModel, timeout_seconds: float = 2.0) -> None:
        self.model = model
        self.timeout_seconds = timeout_seconds
        self._queue = Semaphore(1)
        self._cache: LruCache[FormulaResponse] = LruCache()

    async def generate(self, request: FormulaRequest) -> FormulaResponse:
        request_id = str(uuid.uuid4())
        started = time.perf_counter()
        cache_key = hashlib.sha256(
            f"{self.model.adapter_version}|{serialize_request(request)}".encode()
        ).hexdigest()
        cached = self._cache.get(cache_key)
        if cached:
            return cached.model_copy(update={"request_id": request_id, "latency_ms": 0})
        try:
            async with self._queue:
                formula = await wait_for(self._model_call(request), timeout=self.timeout_seconds)
        except TimeoutError:
            return self._response(
                request_id, ResultStatus.ABSTAINED, None, ["Inference timed out"], None, started
            )
        except Exception:
            return self._response(
                request_id, ResultStatus.ABSTAINED, None, ["Model unavailable"], None, started
            )
        if not formula:
            return self._response(
                request_id,
                ResultStatus.ABSTAINED,
                None,
                ["Model did not return a valid formula"],
                None,
                started,
            )
        evaluation = validate_and_evaluate(formula, request.cells, request.target_cell)
        result = self._response(
            request_id,
            ResultStatus.VALID if evaluation.valid else ResultStatus.INVALID,
            formula,
            evaluation.errors,
            evaluation.value,
            started,
        )
        self._cache.put(cache_key, result)
        return result

    async def _model_call(self, request: FormulaRequest) -> str | None:
        # Kept as an async boundary so production can move inference to a worker without API changes.
        return self.model.generate(request)

    def _response(
        self,
        request_id: str,
        status: ResultStatus,
        formula: str | None,
        errors: list[str],
        preview: object | None,
        started: float,
    ) -> FormulaResponse:
        return FormulaResponse(
            request_id=request_id,
            status=status,
            formula=formula,
            validation_errors=errors,
            preview_value=preview,
            model_id=self.model.model_id,
            adapter_version=self.model.adapter_version,
            latency_ms=round((time.perf_counter() - started) * 1000),
        )
