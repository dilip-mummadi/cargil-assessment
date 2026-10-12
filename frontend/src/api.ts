import type { RiskFilters, RiskMetadata, RiskPage, RiskSummary } from './types'

function withFilters(filters: RiskFilters, extra: Record<string, string | number> = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) query.set(key, value.trim())
  }
  for (const [key, value] of Object.entries(extra)) query.set(key, String(value))
  return query.toString()
}

export async function getMetadata(signal?: AbortSignal): Promise<RiskMetadata> {
  const response = await fetch('/api/metadata', { signal })
  if (!response.ok) throw new Error('Could not load filter values')
  return response.json() as Promise<RiskMetadata>
}

export async function getSummary(
  filters: RiskFilters,
  groupBy: 'commodity' | 'book',
  signal?: AbortSignal,
): Promise<RiskSummary> {
  const response = await fetch(`/api/summary?${withFilters(filters, { groupBy })}`, { signal })
  if (!response.ok) throw new Error('Could not load risk summary')
  return response.json() as Promise<RiskSummary>
}

export async function getPage(
  filters: RiskFilters,
  startRow: number,
  endRow: number,
  sortBy?: string,
  sortDirection?: string,
  signal?: AbortSignal,
): Promise<RiskPage> {
  const extra: Record<string, string | number> = { startRow, endRow }
  if (sortBy) extra.sortBy = sortBy
  if (sortDirection) extra.sortDirection = sortDirection
  const response = await fetch(`/api/positions?${withFilters(filters, extra)}`, { signal })
  if (!response.ok) throw new Error('Could not load risk positions')
  return response.json() as Promise<RiskPage>
}
