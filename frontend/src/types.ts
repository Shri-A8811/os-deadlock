export type Scenario = {
  title: string
  description: string
  allocation: number[][]
  maximum: number[][]
  available: number[]
  request?: { process: number; vector: number[] }
}

export type TraceStep = {
  process: number | null
  workBefore: number[]
  need: number[] | null
  workAfter: number[]
  explanation: string
}

export type SafetyResult = {
  safe: boolean
  sequence: number[]
  need: number[][]
  trace: TraceStep[]
  message: string
}

export type RequestResult = {
  status: 'granted' | 'waiting' | 'denied_unsafe' | 'invalid'
  message: string
  safety: SafetyResult | null
  allocation: number[][]
  available: number[]
  trialAllocation?: number[][]
  trialAvailable?: number[]
}
