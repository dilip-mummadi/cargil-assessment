export interface RiskPosition {
  tradeId: string
  book: string
  commodity: string
  counterparty: string
  region: string
  instrumentType: string
  position: number
  currency: string
  marketPrice: number
  pnl: number
  fxExposure: number
  asOfDate: string
}

export interface RiskPage {
  rows: RiskPosition[]
  totalCount: number
}

export interface RiskGroup {
  key: string
  count: number
  position: number | null
  pnl: number
  fxExposure: number
}

export interface RiskSummary {
  totalCount: number
  totalPnl: number
  totalFxExposure: number
  groupBy: 'commodity' | 'book'
  groups: RiskGroup[]
}

export interface RiskMetadata {
  asOfDate: string
  books: string[]
  commodities: string[]
  regions: string[]
  currencies: string[]
  instrumentTypes: string[]
}

export interface RiskFilters {
  book: string
  commodity: string
  region: string
  currency: string
  instrumentType: string
  search: string
}
