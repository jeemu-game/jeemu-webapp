import sys
from pathlib import Path

# Add the 'backend' directory to sys.path so 'app.xxx' imports work perfectly on Vercel
backend_path = str(Path(__file__).parent.parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


# Vercel requires the application instance to be named `app`
# It will automatically wrap this ASGI app into its serverless environment
from app.main import app  # noqa: E402

__all__ = ["app"]
