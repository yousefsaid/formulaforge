# Hosted-demo image: runs the backend in fake-model mode only. MLX requires Apple
# Silicon and is not installed here -- FORMULAFORGE_MODEL defaults to "fake" (see
# app/main.py::build_service), so the deterministic validator/evaluator still runs
# for real, but formula generation returns the stub model's fixed output. Never set
# FORMULAFORGE_MODEL=mlx in this image; there is no MLX runtime here to serve it.
FROM python:3.11-slim

RUN pip install --no-cache-dir uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

COPY app ./app

ENV FORMULAFORGE_MODEL=fake
EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
