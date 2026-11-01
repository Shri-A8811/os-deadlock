import type { RequestResult, SafetyResult } from './types'

const API = 'http://127.0.0.1:8000'

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail ?? 'The local algorithm service returned an error.')
  return data as T
}

export const analyzeSafety = (allocation: number[][], maximum: number[][], available: number[]) =>
  post<SafetyResult>('/api/safety', { allocation, maximum, available })

export const checkRequest = (allocation: number[][], maximum: number[][], available: number[], process: number, request: number[]) =>
  post<RequestResult>('/api/request', { allocation, maximum, available, process, request })

export const detectDeadlock = (allocation: number[][], request: number[][], available: number[]) =>
  post<{ deadlocked: number[]; sequence: number[]; trace: { process: number | null; workBefore: number[]; workAfter: number[]; explanation: string }[]; message: string }>('/api/detect', { allocation, request, available })
