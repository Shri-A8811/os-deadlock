from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
BACKEND = ROOT / "backend"
VENV_PYTHON = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def wait_for_backend(process: subprocess.Popen[bytes], timeout: float = 30) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            return False
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1) as response:
                return response.status == 200
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.3)
    return False


def main() -> int:
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        print("Node.js and npm are required. Install Node.js, then run npm install in frontend/.")
        return 1
    if not (FRONTEND / "node_modules").exists():
        print("Frontend packages are not installed yet. Run: cd frontend && npm install")
        return 1

    python = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable
    try:
        check = subprocess.run([python, "-c", "import uvicorn"], capture_output=True, check=False)
        if check.returncode != 0:
            print("FastAPI dependencies are missing. Run: .venv\\Scripts\\python -m pip install -r backend\\requirements.txt")
            return 1
    except OSError:
        print("Could not locate the Python environment. Install backend/requirements.txt first.")
        return 1

    api = subprocess.Popen(
        [python, "-m", "uvicorn", "main:app", "--app-dir", str(BACKEND), "--host", "127.0.0.1", "--port", "8000"],
        cwd=ROOT,
    )
    ui = None
    try:
        if not wait_for_backend(api):
            print("The local algorithm service did not start. Check the Python environment and port 8000.")
            return 1
        if os.name == "nt":
            ui = subprocess.Popen(f'"{npm}" run dev', cwd=FRONTEND, shell=True)
        else:
            ui = subprocess.Popen([npm, "run", "dev"], cwd=FRONTEND)
        time.sleep(1.5)
        if ui.poll() is not None:
            print("The dashboard interface did not start. Check frontend dependencies and port 5173.")
            return 1
        url = "http://127.0.0.1:5173"
        print(f"Deadlock Lab is running at {url}")
        print("Keep this window open. Press Ctrl+C to stop both local services.")
        webbrowser.open(url)
        while api.poll() is None and ui.poll() is None:
            time.sleep(0.5)
        return 0
    except KeyboardInterrupt:
        print("\nStopping Deadlock Lab...")
        return 0
    finally:
        for child in (ui, api):
            if child and child.poll() is None:
                child.terminate()
        for child in (ui, api):
            if child and child.poll() is None:
                try:
                    child.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    child.kill()


if __name__ == "__main__":
    raise SystemExit(main())
