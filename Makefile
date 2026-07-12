PYTHON := cd backend && uv run

.PHONY: setup setup-ml test lint prepare baseline train evaluate reproduce api web
setup:
	uv sync --project backend --extra dev
	cd frontend && npm install
setup-ml:
	uv sync --project backend --extra dev --extra ml
test:
	$(PYTHON) pytest -q
	cd frontend && npm test -- --run
lint:
	$(PYTHON) ruff check app tests
	$(PYTHON) mypy app
	cd frontend && npm run lint && npm run typecheck
prepare:
	$(PYTHON) python ../ml/scripts/prepare_data.py
baseline:
	$(PYTHON) python ../ml/scripts/evaluate.py --model base
train:
	$(PYTHON) python ../ml/scripts/train.py
evaluate:
	$(PYTHON) python ../ml/scripts/evaluate.py --model adapted
reproduce: setup-ml prepare baseline train evaluate
api:
	$(PYTHON) uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
web:
	cd frontend && npm run dev
