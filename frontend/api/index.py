"""Vercel Python Function entrypoint.

Serves the hosted demo backend (fake-model + real deterministic validator)
from ../formulaforge_backend, a snapshot of backend/app kept in sync
manually since Vercel builds only this project directory.
"""
from formulaforge_backend.main import app  # noqa: F401
