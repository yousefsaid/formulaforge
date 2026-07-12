from app.model import parse_formula_output


def test_parses_exact_json() -> None:
    assert parse_formula_output('{"formula":"=sum(A1:A2)"}') == "=SUM(A1:A2)"


def test_extracts_one_object_from_text() -> None:
    assert parse_formula_output('Here: {"formula":"=A1+A2"}') == "=A1+A2"


def test_rejects_extra_keys() -> None:
    assert parse_formula_output('{"formula":"=A1","note":"x"}') is None
