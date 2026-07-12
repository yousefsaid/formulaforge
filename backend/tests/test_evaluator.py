from app.contracts import CellValue
from app.evaluator import validate_and_evaluate


def cells() -> list[CellValue]:
    return [
        CellValue(address="A1", value=2),
        CellValue(address="A2", value=3),
        CellValue(address="B1", value=10),
    ]


def test_evaluates_allowed_formula() -> None:
    result = validate_and_evaluate("=SUM(A1:A2)+B1", cells(), "C1")
    assert result.valid and result.value == 15


def test_rejects_unknown_reference() -> None:
    result = validate_and_evaluate("=SUM(A1:A3)", cells(), "C1")
    assert not result.valid and "Unknown cell" in result.errors[0]


def test_rejects_unsupported_function() -> None:
    result = validate_and_evaluate('=TEXT(A1,"0")', cells(), "C1")
    assert not result.valid and "Unsupported function" in result.errors[0]
