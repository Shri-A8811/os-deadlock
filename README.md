# Deadlock Lab

An offline-first teaching dashboard for Banker’s algorithm, resource requests, deadlock detection, prevention, and recovery.

## Stack

- React + TypeScript + Vite frontend
- Python + FastAPI algorithm service
- React Flow resource-allocation graph
- Recharts Work-vector trace
- No database, external fonts, remote images, or runtime API calls outside localhost

See [AI_DESIGN_GUIDELINES.md](AI_DESIGN_GUIDELINES.md) for the visual and accessibility checklist used for this dashboard.

## First-time setup

Install Node.js and Python 3.10 or newer. Setup needs internet access to download packages; after setup, the dashboard runs locally without internet.

From this directory, create a Python environment and install the backend dependencies:

```powershell
py -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt
```

Install frontend dependencies once:

```powershell
cd frontend
npm install
cd ..
```

## Run the demo

Double-click `run_dashboard.bat`, or run `py start.py` here. The launcher starts FastAPI and Vite on localhost and opens the dashboard. Keep the launcher window open while presenting; press Ctrl+C to stop both services.

- Frontend: http://127.0.0.1:5173
- API health: http://127.0.0.1:8000/api/health

## Dashboard modes

- **Avoidance:** Edit process/resource dimensions, Allocation, Maximum, and Available. Need is calculated automatically. Run the safety algorithm, inspect its Work trace, use step controls or autoplay, and submit a resource request.
- **Detection:** Edit outstanding Request values, inspect the allocation/request graph, run the multiple-instance detection algorithm, and terminate a process to release its resources.
- **Prevention & recovery:** See how fixed resource ordering prevents circular wait, plus its concurrency/utilization trade-off.

Built-in examples cover a safe state, a request deferred for insufficient Available resources, a request denied because it would make the state unsafe, a two-process circular wait with one instance of each resource, and a zero-Available boundary case where a zero-Need process can still finish.

The interface intentionally uses system fonts and bundled code only, so its layout and behavior do not depend on internet access during the demo.
