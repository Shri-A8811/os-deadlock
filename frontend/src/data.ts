import type { Scenario } from './types'

export const scenarios: Record<string, Scenario> = {
  safe: {
    title: 'Safe state',
    description: 'The classic five-process example. Follow the available resources as each process finishes.',
    allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
    maximum: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    available: [3, 3, 2],
    request: { process: 1, vector: [1, 0, 2] },
  },
  waiting: {
    title: 'Request waits',
    description: 'The request is within remaining Need but asks for more than is currently Available.',
    allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
    maximum: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    available: [3, 3, 2],
    request: { process: 4, vector: [4, 0, 0] },
  },
  unsafe: {
    title: 'Request makes state unsafe',
    description: 'A valid request fits Available, but granting it removes every complete safe sequence.',
    allocation: [[1, 0], [0, 1], [1, 0]],
    maximum: [[3, 2], [1, 2], [2, 2]],
    available: [1, 1],
    request: { process: 0, vector: [1, 1] },
  },
  deadlock: {
    title: 'Circular wait · single instance',
    description: 'P0 holds R0 and waits for R1; P1 holds R1 and waits for R0. With one instance of each resource, both are deadlocked.',
    allocation: [[1, 0], [0, 1]],
    maximum: [[1, 1], [1, 1]],
    available: [0, 0],
  },
  boundary: {
    title: 'Zero-available boundary',
    description: 'Available is zero, but P0 has zero remaining Need and can finish to release resources.',
    allocation: [[0, 1], [1, 0]],
    maximum: [[0, 1], [1, 1]],
    available: [0, 0],
    request: { process: 0, vector: [0, 0] },
  },
}
