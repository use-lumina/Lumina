# Contributing to Lumina

Thank you for your interest in contributing to Lumina! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Be kind, be professional, and be collaborative.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/lumina.git
   cd lumina
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/use-lumina/Lumina.git
   ```

## Development Setup

### Prerequisites

- **Bun 1.0+** - [Install Bun](https://bun.sh)
- **PostgreSQL 14+** - [Install PostgreSQL](https://www.postgresql.org/download/)
- **Node.js 20+** (for examples)

### Installation

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Create database**:

   ```bash
   createdb lumina
   ```

3. **Set environment variables**:

   ```bash
   export DATABASE_URL="postgres://localhost:5432/lumina"
   ```

4. **Start development services**:

   ```bash
   # Terminal 1: Ingestion service
   cd services/ingestion && bun run dev

   # Terminal 2: Query API
   cd services/query && bun run dev

   # Terminal 3: Replay service
   cd services/replay && bun run dev
   ```

## Making Changes

### Branching Strategy

- `main` - Stable, production-ready code
- `feature/your-feature-name` - New features
- `fix/your-bug-fix` - Bug fixes
- `docs/your-docs-change` - Documentation updates

### Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### Keep Your Fork Updated

```bash
git fetch upstream
git rebase upstream/main
```

## Testing

### Run Tests

```bash
# Run all tests
bun test

# Run tests for a specific package
cd packages/core
bun test
```

### Write Tests

- Place test files next to the code they test: `feature.test.ts`
- Use descriptive test names
- Cover edge cases and error scenarios
- Aim for meaningful coverage of business logic

**Example test structure**:

```typescript
import { describe, test, expect } from 'bun:test';
import { calculateCost } from './cost-calculator';

describe('calculateCost', () => {
  test('calculates cost for GPT-4 correctly', () => {
    const result = calculateCost('gpt-4', 1000, 500);
    expect(result).toBeCloseTo(0.06);
  });

  test('returns 0 for unknown model', () => {
    const result = calculateCost('unknown-model', 1000, 500);
    expect(result).toBe(0);
  });
});
```

## Submitting Changes

### Before Submitting

1. **Run linting**:

   ```bash
   bun run lint:fix
   ```

2. **Run formatting**:

   ```bash
   bun run format
   ```

3. **Run tests**:

   ```bash
   bun run test
   ```

4. **Build packages**:
   ```bash
   bun run build:packages
   ```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Longer description if needed

Fixes #123
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(sdk): add support for streaming LLM calls
fix(ingestion): handle malformed trace payloads
docs(readme): update installation instructions
test(core): add tests for cost calculator
```

### Create Pull Request

1. **Push your branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Fixes #123")
   - Describe what changed and why
   - Add screenshots for UI changes
   - Mark as draft if work is in progress

3. **Respond to feedback**:
   - Address review comments promptly
   - Push additional commits to update the PR
   - Mark conversations as resolved when addressed

### Pull Request Checklist

- [ ] Code follows the project's code style
- [ ] Tests added/updated for new functionality
- [ ] Documentation updated (README, API docs, comments)
- [ ] All tests pass locally
- [ ] Lint and format checks pass
- [ ] Commits follow conventional commit format
- [ ] PR description clearly explains the changes

## Code Style

Lumina uses automated code quality tools:

- **ESLint** - Linting TypeScript/JavaScript
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks

See [docs/guides/CODE_QUALITY.md](./docs/guides/CODE_QUALITY.md) for detailed guidelines.

### Key Conventions

- **TypeScript**: Use strong typing, avoid `any` when possible
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/types
- **Comments**: Explain "why", not "what"
- **Exports**: Use named exports, not default exports
- **File structure**: Group related code, keep files focused

## Project Structure

```
lumina/
├── packages/           # Reusable packages
│   ├── sdk/           # Client SDK (@lumina/sdk)
│   ├── core/          # Shared business logic
│   ├── schema/        # Type definitions
│   └── config/        # Configuration
├── services/          # Backend services
│   ├── ingestion/     # Trace ingestion (Port 9411)
│   ├── query/         # Query API (Port 8081)
│   └── replay/        # Replay engine (Port 8082)
├── apps/              # Frontend applications
│   └── dashboard/     # Next.js dashboard
├── examples/          # Example integrations
│   └── nextjs-rag/    # Next.js RAG example
└── docs/              # Documentation
```

## Areas for Contribution

### High Priority

- [ ] **Tests**: Add test coverage for core packages (SDK, cost calculator, diff engine)
- [ ] **Dashboard UI**: Complete the observability dashboard
- [ ] **Alerting**: Implement real-time webhook alerts
- [ ] **SDK Improvements**: Add support for more LLM providers
- [ ] **Documentation**: Improve quickstart guides, add video tutorials

### Feature Ideas

- Embedding-based semantic search
- Baseline tracking and drift detection
- Multi-tenancy support
- Cost forecasting
- Advanced analytics dashboards
- Integrations (Slack, PagerDuty, etc.)

### Good First Issues

Look for issues labeled `good first issue` on GitHub. These are designed for new contributors.

## Community

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, community chat
- **Twitter**: [@lumina_oss](https://twitter.com/lumina_oss) (coming soon)

## Questions?

If you have questions about contributing:

1. Check the [documentation](./docs/)
2. Search [existing issues](https://github.com/use-lumina/Lumina/issues)
3. Open a new issue with the `question` label

## License

By contributing to Lumina, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).

---

Thank you for contributing to Lumina! 🚀
