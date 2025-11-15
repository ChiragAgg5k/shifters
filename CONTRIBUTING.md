# Contributing to Shifters

Thank you for your interest in contributing to Shifters! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/shifters.git`
3. Install dependencies: `uv sync`
4. **Install pre-commit hooks (REQUIRED)**: `uv run pre-commit install`

## Development Requirements

### Pre-commit Hooks (Mandatory)

All contributors **must** install and use pre-commit hooks. These hooks automatically:

- Format code with Black
- Remove trailing whitespace
- Fix end-of-file issues
- Check for merge conflicts
- Validate YAML and TOML files
- Prevent large files from being committed

**Installation:**

```bash
uv run pre-commit install
```

**Manual run (optional):**

```bash
# Run on all files
uv run pre-commit run --all-files

# Run on staged files only
uv run pre-commit run
```

### Code Style

- **Python formatting**: Black (line length: 88)
- **Line endings**: LF (Unix-style)
- **Imports**: Organize imports logically
- **Type hints**: Use type hints where appropriate

## Making Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Pre-commit hooks will run automatically on `git commit`
4. If hooks fail, fix the issues and commit again
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request

## Pull Request Guidelines

All PRs must:

1. ✅ Pass all pre-commit checks (enforced by GitHub Actions)
2. ✅ Have a clear description of changes
3. ✅ Reference any related issues
4. ✅ Include tests for new functionality (when applicable)
5. ✅ Update documentation if needed

### PR Checklist

- [ ] Pre-commit hooks installed and passing
- [ ] Code formatted with Black
- [ ] All existing tests pass
- [ ] New tests added for new features
- [ ] Documentation updated (README, docstrings)
- [ ] Branch is up to date with main

## Code Review Process

1. GitHub Actions will automatically run pre-commit checks
2. If checks fail, the PR cannot be merged
3. Maintainers will review the code
4. Address any feedback
5. Once approved, your PR will be merged

## Testing

```bash
# Run tests (when available)
uv run pytest

# Run specific test file
uv run pytest tests/test_agents.py

# Run with coverage
uv run pytest --cov=shifters
```

## Running the Application

```bash
# Web visualization (custom UI)
uv run python run_visualization.py

# Mesa Solara UI
uv run python run_visualization.py --mesa

# CLI mode
uv run python -m shifters.cli -n 10 --laps 5
```

## Common Issues

### Pre-commit hooks not running

```bash
# Reinstall hooks
uv run pre-commit install

# Verify installation
ls -la .git/hooks/pre-commit
```

### Black formatting conflicts

If Black makes changes:
1. The pre-commit hook will auto-format and re-stage files
2. Your commit will proceed with formatted code
3. No manual action needed

### Bypassing hooks (NOT RECOMMENDED)

```bash
# Only use in emergencies
git commit --no-verify -m "emergency fix"
```

## Areas for Contribution

1. **Agent Types**: New vehicle types, drones, autonomous agents
2. **Scenarios**: Formula E, MotoGP, supply chain, traffic flow
3. **Visualization**: UI improvements, 2D/3D rendering, charts
4. **Performance**: Optimization, profiling, scaling
5. **Events**: Collisions, pit stops, weather effects
6. **Documentation**: Tutorials, examples, API docs
7. **Tests**: Unit tests, integration tests, benchmarks

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues and PRs before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
