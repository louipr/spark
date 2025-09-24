# Spark Project Makefile
# Common commands used during development

.PHONY: help install build test test-watch test-coverage clean lint fix dev start examples agent

# Default target
help:
	@echo "Spark Project - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  install          Install dependencies"
	@echo "  build            Build the TypeScript project"
	@echo "  dev              Start development mode"
	@echo "  clean            Clean build artifacts"
	@echo ""
	@echo "Testing:"
	@echo "  test             Run all tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint             Run ESLint"
	@echo "  fix              Fix linting issues"
	@echo ""
	@echo "Application:"
	@echo "  start            Start the Spark CLI"
	@echo "  agent            Run agent with prompt (use: make agent PROMPT='your prompt')"
	@echo "  examples         Run examples"
	@echo ""

# Installation and Setup
install:
	npm install

# Build
build:
	npm run build

# Development
dev:
	npm run dev

# Testing
test:
	npm test

# Code Quality
lint:
	npm run lint

fix:
	npm run lint:fix

# Application Commands
start:
	npm start

# Agent command with prompt parameter
agent:
	@if [ -z "$(PROMPT)" ]; then \
		echo "Usage: make agent PROMPT='your prompt here'"; \
		echo "Example: make agent PROMPT='Create a React todo app'"; \
	else \
		cd examples && npm start agent "$(PROMPT)"; \
	fi

# Examples
examples:
	cd examples && npm start

# Clean
clean:
	rm -rf dist/
	rm -rf build/
	rm -rf coverage/
	rm -rf node_modules/.cache/

# Quick development workflow
quick-test: test

# Full check (what we often do)
check: lint test

# Reset everything
reset: clean install build test

# Development setup for new contributors
setup: install build test
	@echo "✅ Setup complete! Try 'make help' for available commands"
