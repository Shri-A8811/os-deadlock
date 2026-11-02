# Deadlock Lab

An offline-first teaching dashboard for Banker’s algorithm, resource requests, deadlock detection, prevention, and recovery.

## Stack

- React + TypeScript + Vite frontend
- Python + FastAPI algorithm service
- React Flow resource-allocation graph
- Recharts Work-vector trace
- No database or external runtime data; local use calls localhost, and deployed use calls the configured API service

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

## Guided simulation

Open the **Simulation** tab for an animated shared-breakfast example of Banker’s scheduling. Three breakfast tasks share two stove spaces and one blender. Use Play, the step controls, or the progress markers to see the scheduler compare each task’s remaining Need with free resources (Work), then return a finished task’s allocation to the kitchen. The animation also supports reduced-motion settings.

## Deploy to Render

The root `render.yaml` defines two free Render services: a static dashboard and the FastAPI algorithm service. The dashboard receives the API URL from Render during its build, and the API accepts requests from the dashboard’s assigned public URL.

1. Push the project to GitHub, including `render.yaml` and the deployment configuration changes.
2. In Render, create a **Blueprint** and connect the `os-deadlock` repository.
3. Review the two services and deploy them. Render will show the public dashboard URL when deployment finishes.
4. Open the dashboard and check the API health endpoint at `<API service URL>/api/health`.

The free API service may spin down after 15 minutes without requests, so its first request after a quiet period can take longer. See [Render’s FastAPI deployment guide](https://render.com/docs/deploy-fastapi) and [Blueprint reference](https://render.com/docs/blueprint-spec).
