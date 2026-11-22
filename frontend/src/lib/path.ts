import type { Inputs } from '../engine/types'

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj)
}

/** Trả bản sao Inputs với giá trị ở `path` (dạng "site.totalArea") đã đổi */
export function setPath(inputs: Inputs, path: string, value: unknown): Inputs {
  const next = structuredClone(inputs) as unknown as Record<string, unknown>
  const parts = path.split('.')
  let cur = next
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]] as Record<string, unknown>
  cur[parts[parts.length - 1]] = value
  return next as unknown as Inputs
}

export function applyPatch(inputs: Inputs, patch: Record<string, unknown>): Inputs {
  return Object.entries(patch).reduce((acc, [k, v]) => setPath(acc, k, v), inputs)
}
