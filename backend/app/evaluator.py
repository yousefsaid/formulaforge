from __future__ import annotations

import ast
import re
from dataclasses import dataclass
from typing import Any

from .contracts import CellValue

ALLOWED_FUNCTIONS = frozenset(
    {
        "SUM",
        "AVERAGE",
        "MIN",
        "MAX",
        "COUNT",
        "COUNTA",
        "IF",
        "SUMIF",
        "COUNTIF",
        "INDEX",
        "MATCH",
        "VLOOKUP",
    }
)
CELL_RE = re.compile(r"(?<![A-Z0-9_])\$?([A-Z]{1,3})\$?([1-9][0-9]*)(?![A-Z0-9_])")
FUNCTION_RE = re.compile(r"\b([A-Z][A-Z0-9_]*)\s*\(")
RANGE_RE = re.compile(r"\$?([A-Z]{1,3})\$?([1-9][0-9]*):\$?([A-Z]{1,3})\$?([1-9][0-9]*)")


@dataclass(frozen=True)
class EvaluationResult:
    valid: bool
    errors: list[str]
    value: Any | None = None


def _column_to_int(column: str) -> int:
    value = 0
    for letter in column:
        value = value * 26 + ord(letter) - 64
    return value


def _in_range(address: str, start: str, end: str) -> bool:
    match = CELL_RE.fullmatch(address)
    start_match = CELL_RE.fullmatch(start)
    end_match = CELL_RE.fullmatch(end)
    if not (match and start_match and end_match):
        return False
    col, row = _column_to_int(match.group(1)), int(match.group(2))
    col_a, row_a = _column_to_int(start_match.group(1)), int(start_match.group(2))
    col_b, row_b = _column_to_int(end_match.group(1)), int(end_match.group(2))
    return min(col_a, col_b) <= col <= max(col_a, col_b) and min(row_a, row_b) <= row <= max(
        row_a, row_b
    )


def _values_for_range(start: str, end: str, values: dict[str, Any]) -> list[Any]:
    return [value for address, value in values.items() if _in_range(address, start, end)]


def _safe_number(value: Any) -> float | int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return value
    raise ValueError("non-numeric value")


def validate_and_evaluate(
    formula: str, cells: list[CellValue], target_cell: str
) -> EvaluationResult:
    if not formula.startswith("="):
        return EvaluationResult(False, ["Formula must start with ="])
    if len(formula) > 2048:
        return EvaluationResult(False, ["Formula is too long"])
    if "!" in formula or "[" in formula or ";" in formula:
        return EvaluationResult(False, ["Cross-sheet and external references are not supported"])
    functions = {name.upper() for name in FUNCTION_RE.findall(formula.upper())}
    unsupported = sorted(functions - ALLOWED_FUNCTIONS)
    if unsupported:
        return EvaluationResult(False, [f"Unsupported function: {', '.join(unsupported)}"])
    if target_cell.upper() in {
        f"{c.group(1)}{c.group(2)}" for c in CELL_RE.finditer(formula.upper())
    }:
        return EvaluationResult(False, ["Circular reference to target cell"])
    values = {cell.address.upper(): cell.value for cell in cells}
    references = {f"{c.group(1)}{c.group(2)}" for c in CELL_RE.finditer(formula.upper())}
    missing = sorted(reference for reference in references if reference not in values)
    if missing:
        return EvaluationResult(False, [f"Unknown cell reference: {', '.join(missing[:5])}"])
    try:
        return EvaluationResult(True, [], _evaluate(formula[1:].upper(), values))
    except (ValueError, SyntaxError, TypeError, ZeroDivisionError) as exc:
        return EvaluationResult(False, [f"Could not evaluate formula: {exc}"])


def _evaluate(expression: str, values: dict[str, Any]) -> Any:
    def range_replacer(match: re.Match[str]) -> str:
        return repr(
            _values_for_range(
                f"{match.group(1)}{match.group(2)}", f"{match.group(3)}{match.group(4)}", values
            )
        )

    expression = RANGE_RE.sub(range_replacer, expression)
    expression = CELL_RE.sub(lambda m: repr(values[f"{m.group(1)}{m.group(2)}"]), expression)
    expression = expression.replace("^", "**").replace("<>", "!=")
    expression = re.sub(r"(?<![<>=!])=(?!=)", "==", expression)
    tree = ast.parse(expression, mode="eval")

    def visit(node: ast.AST) -> Any:
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.List):
            return [visit(item) for item in node.elts]
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            return (+1 if isinstance(node.op, ast.UAdd) else -1) * _safe_number(visit(node.operand))
        if isinstance(node, ast.BinOp):
            left, right = _safe_number(visit(node.left)), _safe_number(visit(node.right))
            return {
                ast.Add: left + right,
                ast.Sub: left - right,
                ast.Mult: left * right,
                ast.Div: left / right,
                ast.Pow: left**right,
            }[type(node.op)]
        if isinstance(node, ast.Compare) and len(node.ops) == 1:
            left, right = visit(node.left), visit(node.comparators[0])
            return {
                ast.Eq: left == right,
                ast.NotEq: left != right,
                ast.Lt: left < right,
                ast.LtE: left <= right,
                ast.Gt: left > right,
                ast.GtE: left >= right,
            }[type(node.ops[0])]
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            args = [visit(arg) for arg in node.args]
            name = node.func.id

            def flatten(groups: list[Any]) -> list[Any]:
                return [
                    item
                    for group in groups
                    for item in (group if isinstance(group, list) else [group])
                ]

            if name == "SUM":
                return sum(_safe_number(value) for value in flatten(args))
            if name == "AVERAGE":
                items = [_safe_number(value) for value in flatten(args)]
                return sum(items) / len(items)
            if name == "MIN":
                return min(_safe_number(value) for value in flatten(args))
            if name == "MAX":
                return max(_safe_number(value) for value in flatten(args))
            if name == "COUNT":
                return sum(
                    isinstance(value, (int, float)) and not isinstance(value, bool)
                    for value in flatten(args)
                )
            if name == "COUNTA":
                return sum(value is not None and value != "" for value in flatten(args))
            if name == "IF" and len(args) == 3:
                return args[1] if args[0] else args[2]
            if name in {"SUMIF", "COUNTIF"}:
                raise ValueError(
                    f"{name} validation is supported; preview needs a simple arithmetic formula"
                )
            if name in {"INDEX", "MATCH", "VLOOKUP"}:
                raise ValueError(f"{name} validation is supported; preview is unavailable")
        raise ValueError("unsupported expression")

    return visit(tree)
