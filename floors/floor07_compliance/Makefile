.PHONY: up down build test lint format migrate makemigrations logs shell clean

# ─── Docker ───────────────────────────────────────────────────────────────────
up:
	docker compose up -d

up-build:
	docker compose up --build -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f api

shell:
	docker compose exec api bash

# ─── Testing ──────────────────────────────────────────────────────────────────
test:
	poetry run pytest

test-unit:
	poetry run pytest tests/unit -v

test-integration:
	poetry run pytest tests/integration -v

test-api:
	poetry run pytest tests/api -v

# ─── Quality ──────────────────────────────────────────────────────────────────
lint:
	poetry run ruff check app tests

lint-fix:
	poetry run ruff check --fix app tests

format:
	poetry run black app tests main.py

format-check:
	poetry run black --check app tests main.py

typecheck:
	poetry run mypy app

# ─── Database ─────────────────────────────────────────────────────────────────
migrate:
	poetry run alembic upgrade head

makemigrations:
	poetry run alembic revision --autogenerate -m "$(MSG)"

downgrade:
	poetry run alembic downgrade -1

# ─── Utilities ────────────────────────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage

install:
	poetry install

env:
	cp .env.example .env
