from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Deadlock Lab Algorithms", version="1.0.0")
local_origins = ["http://127.0.0.1:5173", "http://localhost:5173"]
deployment_origins = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([*local_origins, *deployment_origins])),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

Matrix = list[list[int]]
Vector = list[int]
class StateInput(BaseModel):
    allocation: Matrix
    maximum: Matrix
    available: Vector


class RequestInput(StateInput):
    process: int
    request: Vector


class DetectionInput(BaseModel):
    allocation: Matrix
    request: Matrix
    available: Vector


def validate_state(allocation: Matrix, maximum: Matrix, available: Vector) -> None:
    if not allocation or not allocation[0]:
        raise HTTPException(422, "Add at least one process and one resource type.")
    rows, cols = len(allocation), len(allocation[0])
    if len(maximum) != rows or any(len(row) != cols for row in allocation + maximum):
        raise HTTPException(422, "Allocation and Maximum must have the same rectangular dimensions.")
    if len(available) != cols:
        raise HTTPException(422, "Available must contain one value for each resource type.")
    if any(value < 0 for row in allocation + maximum for value in row) or any(value < 0 for value in available):
        raise HTTPException(422, "Resource counts cannot be negative.")
    for p, (allocated, maximum_row) in enumerate(zip(allocation, maximum)):
        if any(a > m for a, m in zip(allocated, maximum_row)):
            raise HTTPException(422, f"P{p} has an allocation greater than its declared maximum.")


def run_safety(allocation: Matrix, maximum: Matrix, available: Vector) -> dict:
    validate_state(allocation, maximum, available)
    need = [[m - a for a, m in zip(alloc, maximum_row)] for alloc, maximum_row in zip(allocation, maximum)]
    work = available.copy()
    finished = [False] * len(allocation)
    sequence: list[int] = []
    trace = [{"process": None, "workBefore": work.copy(), "need": None, "workAfter": work.copy(),
              "explanation": "Start with Available as the Work vector. No process has finished yet."}]

    while True:
        candidate = next((p for p, row in enumerate(need)
                          if not finished[p] and all(n <= w for n, w in zip(row, work))), None)
        if candidate is None:
            break
        before = work.copy()
        work = [w + a for w, a in zip(work, allocation[candidate])]
        finished[candidate] = True
        sequence.append(candidate)
        trace.append({"process": candidate, "workBefore": before, "need": need[candidate].copy(),
                      "workAfter": work.copy(),
                      "explanation": f"P{candidate} can finish because Need ≤ Work. It releases its allocation back to the system."})

    safe = all(finished)
    message = ("All processes can finish; the current state is safe." if safe
               else "No unfinished process can meet its remaining Need with the current Work. The state is unsafe, but this alone does not prove deadlock.")
    if not safe:
        blocked = [p for p, done in enumerate(finished) if not done]
        trace.append({"process": None, "workBefore": work.copy(), "need": None, "workAfter": work.copy(),
                      "explanation": f"No remaining process can proceed. Unfinished: {', '.join(f'P{p}' for p in blocked)}."})
    return {"safe": safe, "sequence": sequence, "need": need, "trace": trace, "message": message}


@app.get("/api/health")
def health():
    return {"status": "ready", "service": "deadlock-lab"}


@app.post("/api/safety")
def safety(data: StateInput):
    return run_safety(data.allocation, data.maximum, data.available)


@app.post("/api/request")
def request_resources(data: RequestInput):
    allocation, maximum, available = data.allocation, data.maximum, data.available
    validate_state(allocation, maximum, available)
    p = data.process
    if p < 0 or p >= len(allocation):
        raise HTTPException(422, "Choose a process that exists in the current scenario.")
    if len(data.request) != len(available):
        raise HTTPException(422, "Request must contain one value for each resource type.")
    if any(value < 0 for value in data.request):
        raise HTTPException(422, "Requests cannot contain negative values.")
    need = [m - a for a, m in zip(allocation[p], maximum[p])]
    if any(r > n for r, n in zip(data.request, need)):
        raise HTTPException(422, "Request exceeds this process's remaining Need.")

    if any(r > a for r, a in zip(data.request, available)):
        return {"status": "waiting", "message": "Valid request, but it exceeds Available. Defer it; the current allocation remains unchanged.",
                "safety": None, "allocation": allocation, "available": available}

    trial_allocation = [row.copy() for row in allocation]
    trial_available = available.copy()
    trial_allocation[p] = [a + r for a, r in zip(allocation[p], data.request)]
    trial_available = [a - r for a, r in zip(available, data.request)]
    result = run_safety(trial_allocation, maximum, trial_available)
    if result["safe"]:
        return {"status": "granted", "message": "Request granted: the simulated state remains safe.",
                "safety": result, "allocation": trial_allocation, "available": trial_available}
    return {"status": "denied_unsafe", "message": "Request denied: the simulated state is unsafe. The original allocation is retained.",
            "safety": result, "allocation": allocation, "available": available,
            "trialAllocation": trial_allocation, "trialAvailable": trial_available}


@app.post("/api/detect")
def detect(data: DetectionInput):
    allocation, requests, available = data.allocation, data.request, data.available
    if not allocation or not allocation[0]:
        raise HTTPException(422, "Add at least one process and one resource type.")
    rows, cols = len(allocation), len(allocation[0])
    if len(requests) != rows or any(len(row) != cols for row in allocation + requests) or len(available) != cols:
        raise HTTPException(422, "Allocation, Request, and Available dimensions do not match.")
    if any(v < 0 for row in allocation + requests for v in row) or any(v < 0 for v in available):
        raise HTTPException(422, "Resource counts cannot be negative.")
    work = available.copy()
    finished = [not any(row) for row in allocation]
    trace = [{"process": None, "workBefore": work.copy(), "workAfter": work.copy(),
              "explanation": "Initialize Work = Available. Processes with no allocated resources can finish."}]
    while True:
        candidate = next((p for p in range(rows) if not finished[p]
                          and all(req <= w for req, w in zip(requests[p], work))), None)
        if candidate is None:
            break
        before = work.copy()
        work = [w + a for w, a in zip(work, allocation[candidate])]
        finished[candidate] = True
        trace.append({"process": candidate, "workBefore": before, "workAfter": work.copy(),
                      "explanation": f"P{candidate}'s outstanding Request can be met. It finishes and releases its Allocation."})
    deadlocked = [p for p, done in enumerate(finished) if not done]
    if deadlocked:
        trace.append({"process": None, "workBefore": work.copy(), "workAfter": work.copy(),
                      "explanation": f"No remaining request fits Work. Under the stated model, unfinished processes are deadlocked: {', '.join(f'P{p}' for p in deadlocked)}."})
        message = "Deadlock detected among unfinished processes under this multiple-instance detection model."
    else:
        message = "No deadlock detected: every process can finish in the detection pass."
    return {"deadlocked": deadlocked, "sequence": [s["process"] for s in trace if s["process"] is not None],
            "trace": trace, "message": message}
