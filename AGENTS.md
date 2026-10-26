# Agent Guidelines: Jeemu Webapp

## Python Toolchain: UV ONLY
- **`uv` is the official and exclusive package manager, virtual environment manager, and runner.**
- Do NOT use standalone `pip` or manual venv activators.
- All Python execution, testing, linting, and package additions must use `uv`:
  - Run tests: `uv run pytest backend/tests`
  - Run linters: `uv run ruff check`
  - Run formatters: `uv run ruff format`
  - Install dependencies: `uv pip install ...` or `uv add ...`
