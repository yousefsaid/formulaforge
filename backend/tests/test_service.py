import asyncio

from app.contracts import CellValue, FormulaRequest, TaskType
from app.model import FakeFormulaModel
from app.service import FormulaService


def request(instruction: str = "sum") -> FormulaRequest:
    return FormulaRequest(
        task_type=TaskType.GENERATE,
        instruction=instruction,
        sheet_name="Sheet1",
        target_cell="B2",
        cells=[CellValue(address="A1", value=2), CellValue(address="A2", value=3)],
    )


async def test_generate_returns_valid_result_for_fake_model() -> None:
    service = FormulaService(FakeFormulaModel())
    result = await service.generate(request())
    assert result.status.value == "valid"
    assert result.formula == "=SUM(A1:A2)"


async def test_repeated_identical_request_hits_cache() -> None:
    service = FormulaService(FakeFormulaModel())
    first = await service.generate(request("sum them"))
    second = await service.generate(request("sum them"))
    assert second.latency_ms == 0
    assert second.formula == first.formula
    assert second.request_id != first.request_id


async def test_abstains_when_model_raises() -> None:
    class BrokenModel:
        model_id = "broken"
        adapter_version = None

        def generate(self, req: FormulaRequest) -> str | None:
            raise RuntimeError("boom")

    service = FormulaService(BrokenModel())
    result = await service.generate(request())
    assert result.status.value == "abstained"
    assert result.validation_errors == ["Model unavailable"]


async def test_abstains_when_model_returns_none() -> None:
    class SilentModel:
        model_id = "silent"
        adapter_version = None

        def generate(self, req: FormulaRequest) -> str | None:
            return None

    service = FormulaService(SilentModel())
    result = await service.generate(request())
    assert result.status.value == "abstained"
    assert result.validation_errors == ["Model did not return a valid formula"]


async def test_single_slot_queue_serializes_concurrent_generations() -> None:
    """The semaphore should prevent two model calls from overlapping in time,
    even when both requests yield control (via asyncio.sleep) mid-call."""
    service = FormulaService(FakeFormulaModel())
    active = 0
    max_active = 0

    async def slow_model_call(req: FormulaRequest) -> str | None:
        nonlocal active, max_active
        active += 1
        max_active = max(max_active, active)
        await asyncio.sleep(0.05)
        active -= 1
        return "=SUM(A1:A2)"

    service._model_call = slow_model_call  # type: ignore[method-assign]
    await asyncio.gather(
        service.generate(request("first")), service.generate(request("second"))
    )
    assert max_active == 1


async def test_abstains_on_timeout() -> None:
    class SlowModel:
        model_id = "slow"
        adapter_version = None

        def generate(self, req: FormulaRequest) -> str | None:
            return "=SUM(A1:A2)"

    service = FormulaService(SlowModel(), timeout_seconds=0.01)

    async def hanging_call(req: FormulaRequest) -> str | None:
        await asyncio.sleep(0.5)
        return "=SUM(A1:A2)"

    service._model_call = hanging_call  # type: ignore[method-assign]
    result = await service.generate(request())
    assert result.status.value == "abstained"
    assert result.validation_errors == ["Inference timed out"]
