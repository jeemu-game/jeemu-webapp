# Python Tooling Rule: UV ONLY

## Mandatory Directive
- **`uv` is the sole and exclusive package manager, virtual environment manager, and command runner for Python.**
- NEVER use raw `pip install`, `virtualenv`, or direct python invocations where `uv` should be used.
- ALWAYS use `uv`:
  - Run commands / tests: `uv run pytest backend/tests`
  - Add / install packages: `uv add <package>` or `uv pip install <package>`
  - Run linting / formatting: `uv run ruff check` / `uv run ruff format`
  - Manage environments: `uv venv` / `uv sync`
