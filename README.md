# Spark - Autonomous Agent System

[![Tests](https://img.shields.io/badge/tests-14%20passing-green)](./tests/integration/agent.test.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)

**Spark** transforms natural language requests into executable multi-step workflows. Say goodbye to manual development setup - let AI agents handle the orchestration.

## 🚀 Quick Start

```bash
git clone <repository-url>
cd spark
npm install && npm run build

# Execute an agent workflow
npm start agent "Create a Node.js project with Express and testing"

# Preview workflow plan
npm start plan "Set up a React development environment"

# Get help with all commands
npm start --help
```

## 🤖 From Manual to Autonomous

**Before** - Manual orchestration:
```bash
mkdir project && cd project
npm init -y && npm install express
echo "console.log('Hello');" > index.js
npm install --save-dev jest
# ... 15+ more steps
```

**After** - One command:
```bash
npm start agent "Create a Node.js project with Express and Jest testing"
```

## ⚡ What Spark Does

1. **🧠 Plans** - LLM converts your request to executable steps
2. **🔧 Executes** - Runs steps with dependency management  
3. **🛡️ Secures** - Built-in safety controls and validation
4. **🔄 Recovers** - Automatic retry with error handling
5. **📊 Reports** - Real-time progress and results

## 📖 Examples

**Create a full-stack application:**
```bash
npm start agent "Create a React frontend with Express backend and PostgreSQL"
```

**Result:** Complete project with proper structure, dependencies, server code, tests, and documentation - all in under a minute.

**More examples:**
```bash
# Python web scraper with database storage
npm start agent "Create a Python web scraper for news articles with SQLite storage"

# Development environment setup  
npm start agent "Set up a React development environment with TypeScript and testing"

# CI/CD pipeline
npm start agent "Create GitHub Actions workflow for Node.js with testing and deployment"
```

## 🛠️ Built-in Tools

**🤖 GitHub Copilot** - Code generation and analysis  
**📁 File System** - Safe file operations with security controls  
**� Shell** - Secure command execution with dangerous command blocking  
**📄 PRD Generator** - Create product requirement documents  

All tools include comprehensive safety features and validation.

## 🔒 Security First

Spark includes multiple layers of security:
- **Path Validation** - Blocks system directories (`/root`, `/etc`, etc.)
- **Command Filtering** - Prevents dangerous commands (`rm -rf /`, `sudo`, etc.)  
- **Parameter Validation** - All inputs validated before execution
- **Execution Limits** - Timeouts and resource constraints
- **Sandboxing** - Isolated execution environments

## 📊 Status

**✅ Implementation Complete**  
**✅ 14/14 Tests Passing**  
**✅ Production Ready**  
**✅ Fully Documented**

## 🚀 Get Started

```bash
# Preview what Spark will do (no API keys needed)
npm start plan "Create a web scraper with Python and BeautifulSoup"

# Execute with your API keys
export ANTHROPIC_API_KEY=your_key
export OPENAI_API_KEY=your_key
npm start agent "Create a web scraper with Python and BeautifulSoup"
```

## 📚 Documentation

- **[Software Requirements Specification](./docs/SRS.md)** - Complete requirements and functionality
- **[Software Architecture Document](./docs/SAD.md)** - System architecture and design  
- **[API Documentation](./docs/API.md)** - Developer reference and tool development
- **[Test Plan](./docs/TESTING.md)** - Testing strategy and standards
- **[Examples](./examples/)** - Practical use cases and workflows
- **[Changelog](./CHANGELOG.md)** - Version history and improvements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch  
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Transform your development workflow from manual orchestration to autonomous execution.**
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT
