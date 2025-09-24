# Spark Agent System - Examples

This directory contains practical examples of using the Spark agent system for various development tasks.

## Quick Examples

### 1. Basic Project Setup
```bash
npm start agent "Create a TypeScript Node.js project with Express and Jest testing"
```

### 2. Full-Stack Application
```bash
npm start agent "Create a React frontend with Express backend and PostgreSQL database"
```

### 3. Development Environment
```bash
npm start agent "Set up a Python development environment with virtual env, Flask, and pytest"
```

## Advanced Examples

See individual files for detailed examples:

- [`web-scraper.md`](./web-scraper.md) - Python web scraper with BeautifulSoup

### Coming Soon
Additional examples are planned for future releases:
- React component library with Storybook
- REST API with JWT authentication  
- GitHub Actions CI/CD setup
- Microservices architecture setup
- Custom database operations tool
- AWS deployment automation
- Advanced testing automation

## Running Examples

**Prerequisites**: Set up your LLM API keys first:
```bash
export ANTHROPIC_API_KEY="your-claude-api-key"
# OR
export OPENAI_API_KEY="your-openai-api-key"
```

All examples can be run using the agent system:

```bash
# Plan without execution (shows what will be done)
npm start plan "Create a Python web scraper for news articles"

# Execute the workflow  
npm start agent "Create a Python web scraper for news articles"

# Get help with available commands
npm start -- --help

# Commands that work without API keys:
npm start copilot-status          # Check GitHub Copilot availability
npm start -- config --list        # View current configuration
npm start -- history              # View conversation history
```

**Note**: Commands `plan`, `agent`, `generate`, and `suggest` require API keys. Without them, you'll get "No providers available" error. All commands now exit properly after completion.
