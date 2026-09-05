# FinSight — developer convenience targets
.DEFAULT_GOAL := help
SHELL := /bin/bash

BACKEND := backend
ANALYTICS := analytics-service
FRONTEND := frontend

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	 awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

## ---- setup ----
.PHONY: install
install: install-backend install-analytics install-frontend ## Install all dependencies

install-backend: ## Create backend venv + install
	cd $(BACKEND) && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

install-analytics: ## Create analytics venv + install
	cd $(ANALYTICS) && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

install-frontend: ## npm install
	cd $(FRONTEND) && npm install

## ---- run ----
.PHONY: migrate seed
migrate: ## Apply Django migrations
	cd $(BACKEND) && ./.venv/bin/python manage.py migrate

seed: ## Seed a demo user + data
	cd $(BACKEND) && ./.venv/bin/python manage.py seed_demo

run-backend: ## Run Django on :8000
	cd $(BACKEND) && ./.venv/bin/python manage.py runserver 8000

run-analytics: ## Run FastAPI on :9000
	cd $(ANALYTICS) && ./.venv/bin/uvicorn app.main:app --reload --port 9000

run-frontend: ## Run Vite dev server on :5173
	cd $(FRONTEND) && npm run dev

## ---- test ----
.PHONY: test test-backend test-analytics test-frontend
test: test-backend test-analytics test-frontend ## Run every test suite

test-backend: ## Django tests
	cd $(BACKEND) && ./.venv/bin/python manage.py test

test-analytics: ## FastAPI tests
	cd $(ANALYTICS) && ./.venv/bin/python -m pytest

test-frontend: ## Frontend type-check + build
	cd $(FRONTEND) && npm run build

## ---- docker ----
.PHONY: up down logs
up: ## docker compose up --build
	docker compose up --build

down: ## docker compose down
	docker compose down

logs: ## Tail all service logs
	docker compose logs -f
