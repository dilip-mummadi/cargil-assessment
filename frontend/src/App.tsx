import { useEffect, useRef, useState } from 'react'
import {
  CellStyleModule,
  InfiniteRowModelModule,
  ModuleRegistry,
  PaginationModule,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type IDatasource,
  type IGetRowsParams,
} from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { ArrowDownUp, ArrowUpRight, Check, ChevronDown, RotateCcw, Search, X } from 'lucide-react'
import { getMetadata, getPage, getSummary } from './api'
import type { RiskFilters, RiskGroup, RiskMetadata, RiskPosition, RiskSummary } from './types'
import './App.css'

ModuleRegistry.registerModules([CellStyleModule, InfiniteRowModelModule, PaginationModule])

const emptyFilters: RiskFilters = {
  book: '',
  commodity: '',
  region: '',
  currency: '',
  instrumentType: '',
  search: '',
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const compactMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const quantity = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

const columnDefs: ColDef<RiskPosition>[] = [
  { field: 'tradeId', headerName: 'Trade ID', width: 132, pinned: 'left' },
  { field: 'book', width: 126 },
  { field: 'commodity', minWidth: 145 },
  { field: 'counterparty', minWidth: 172, flex: 1 },
  { field: 'region', width: 100 },
  { field: 'instrumentType', headerName: 'Instrument', width: 120 },
  {
    field: 'position',
    width: 126,
    type: 'rightAligned',
    valueFormatter: ({ value }) => quantity.format(value ?? 0),
  },
  { field: 'currency', headerName: 'CCY', width: 82 },
  {
    field: 'marketPrice',
    headerName: 'Mark',
    width: 108,
    type: 'rightAligned',
    valueFormatter: ({ value }) => Number(value ?? 0).toFixed(2),
  },
  {
    field: 'pnl',
    headerName: 'P&L · USD',
    width: 132,
    type: 'rightAligned',
    valueFormatter: ({ value }) => money.format(value ?? 0),
    cellClassRules: {
      'number-negative': ({ value }) => Number(value) < 0,
      'number-positive': ({ value }) => Number(value) > 0,
    },
  },
  {
    field: 'fxExposure',
    headerName: 'FX exposure · USD',
    width: 150,
    type: 'rightAligned',
    valueFormatter: ({ value }) => money.format(value ?? 0),
  },
  { field: 'asOfDate', headerName: 'As of', width: 112 },
]

function createDatasource(filters: RiskFilters): IDatasource {
  return {
    getRows(params: IGetRowsParams) {
      const sort = params.sortModel[0]
      void getPage(
        filters,
        params.startRow,
        params.endRow,
        sort?.colId,
        sort?.sort,
      )
        .then((page) => params.successCallback(page.rows, page.totalCount))
        .catch(() => params.failCallback())
    },
  }
}

function App() {
  const [filters, setFilters] = useState<RiskFilters>(emptyFilters)
  const [searchDraft, setSearchDraft] = useState('')
  const [groupBy, setGroupBy] = useState<'commodity' | 'book'>('commodity')
  const [metadata, setMetadata] = useState<RiskMetadata | null>(null)
  const [summary, setSummary] = useState<RiskSummary | null>(null)
  const [summaryError, setSummaryError] = useState('')
  const [gridApi, setGridApi] = useState<GridApi<RiskPosition> | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<RiskPosition | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void getMetadata(controller.signal).then(setMetadata).catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setSummaryError('')
    void getSummary(filters, groupBy, controller.signal)
      .then(setSummary)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSummaryError('Summary is temporarily unavailable.')
      })
    return () => controller.abort()
  }, [filters, groupBy])

  function updateFilter(key: keyof RiskFilters, value: string) {
    const nextFilters = { ...filters, [key]: value }
    setFilters(nextFilters)
    setSelectedPosition(null)
    gridApi?.setGridOption('datasource', createDatasource(nextFilters))
  }

  function onGridReady(event: GridReadyEvent<RiskPosition>) {
    setGridApi(event.api)
    event.api.setGridOption('datasource', createDatasource(filters))
  }

  function clearFilters() {
    setSearchDraft('')
    setFilters(emptyFilters)
    setSelectedPosition(null)
    gridApi?.setGridOption('datasource', createDatasource(emptyFilters))
  }

  function drillInto(group: RiskGroup) {
    updateFilter(groupBy, group.key)
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Corporate Risk Reporting home">
          <span className="brand-mark">C</span>
          <span className="brand-name">Cargill <b>Risk</b></span>
        </a>
        <div className="topbar-context">
          <span className="crumb-muted">Risk management</span>
          <span className="crumb-divider">/</span>
          <span>Positions</span>
        </div>
        <div className="topbar-status"><span className="status-dot" /> Live dataset</div>
      </header>

      <section className="page-heading" id="top">
        <div>
          <div className="eyebrow">Corporate Risk Reporting <span>·</span> Enterprise</div>
          <h1>Risk positions</h1>
          <p className="page-subtitle">Explore exposure across books, commodities, and counterparties.</p>
        </div>
        <div className="heading-meta">
          <span className="meta-label">VALUATION DATE</span>
          <strong>
            {metadata
              ? new Date(`${metadata.asOfDate}T00:00:00`).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).toUpperCase()
              : '—'}
          </strong>
        </div>
      </section>

      <section className="metrics" aria-label="Filtered risk totals">
        <article className="metric metric-count">
          <span className="metric-label">Matching positions</span>
          <strong>{summary ? summary.totalCount.toLocaleString('en-US') : '—'}</strong>
          <span className="metric-foot">of {metadata ? '50,000' : '—'} records</span>
        </article>
        <article className="metric">
          <span className="metric-label">Net P&L <small>USD</small></span>
          <strong className={summary && summary.totalPnl < 0 ? 'negative' : ''}>
            {summary ? money.format(summary.totalPnl) : '—'}
          </strong>
          <span className="metric-foot">All matching rows</span>
        </article>
        <article className="metric">
          <span className="metric-label">FX exposure <small>USD</small></span>
          <strong>{summary ? money.format(summary.totalFxExposure) : '—'}</strong>
          <span className="metric-foot">All matching rows</span>
        </article>
        <div className="metric-note"><ArrowDownUp size={15} /> Totals update with filters</div>
      </section>

      <section className="content-layout">
        <div className="positions-panel">
          <div className="panel-heading">
            <div>
              <h2>Position blotter</h2>
              <p>Sorted and loaded from the risk service</p>
            </div>
            <button
              className="icon-button refresh-button"
              type="button"
              title="Refresh positions"
              aria-label="Refresh positions"
              onClick={() => gridApi?.refreshInfiniteCache()}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <form
            className="filterbar"
            onSubmit={(event) => {
              event.preventDefault()
              updateFilter('search', searchDraft)
            }}
          >
            <label className="search-field">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search counterparty, commodity, or trade ID</span>
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Counterparty, commodity, trade ID"
              />
              <button className="search-submit" type="submit" aria-label="Search positions">
                <ArrowUpRight size={15} />
              </button>
            </label>
            <FacetSelect label="Book" value={filters.book} options={metadata?.books ?? []}
              onChange={(value) => updateFilter('book', value)} />
            <FacetSelect label="Commodity" value={filters.commodity} options={metadata?.commodities ?? []}
              onChange={(value) => updateFilter('commodity', value)} />
            <FacetSelect label="Region" value={filters.region} options={metadata?.regions ?? []}
              onChange={(value) => updateFilter('region', value)} />
            {activeFilterCount > 0 && (
              <button className="clear-filters" type="button" onClick={clearFilters}>
                <X size={14} /> Clear <span>{activeFilterCount}</span>
              </button>
            )}
          </form>

          <div className="grid-meta">
            <span>{summary ? `${summary.totalCount.toLocaleString('en-US')} positions` : 'Loading positions'}</span>
            <span>Click a row to inspect trade details</span>
          </div>
          <div className="risk-grid ag-theme-quartz">
            <AgGridReact<RiskPosition>
              theme="legacy"
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
              rowModelType="infinite"
              pagination
              paginationPageSize={100}
              paginationPageSizeSelector={[50, 100, 250]}
              cacheBlockSize={100}
              maxBlocksInCache={8}
              onGridReady={onGridReady}
              onRowClicked={(event) => setSelectedPosition(event.data ?? null)}
              getRowId={({ data }) => data.tradeId}
              rowHeight={42}
              headerHeight={42}
              overlayNoRowsTemplate="No positions match these filters"
            />
          </div>
          <div className="grid-footnote">
            Server pagination · 100 rows per page · Sort by selecting a column heading
          </div>
        </div>

        <aside className="insight-panel">
          <section className="summary-section">
            <div className="summary-title-row">
              <div>
                <div className="eyebrow">Filtered aggregation</div>
                <h2>Breakdown</h2>
              </div>
              <fieldset className="segmented">
                <legend className="sr-only">Group summary by</legend>
                <button type="button" aria-pressed={groupBy === 'commodity'}
                  className={groupBy === 'commodity' ? 'selected' : ''} onClick={() => setGroupBy('commodity')}>
                  Commodity
                </button>
                <button type="button" aria-pressed={groupBy === 'book'}
                  className={groupBy === 'book' ? 'selected' : ''} onClick={() => setGroupBy('book')}>
                  Book
                </button>
              </fieldset>
            </div>
            <p className="summary-caption">
              P&L and FX totals use every match. {groupBy === 'commodity'
                ? 'Position is netted within each commodity.'
                : 'Position is omitted across books because units vary by commodity.'}
            </p>
            {summaryError ? (
              <output className="inline-error">{summaryError}</output>
            ) : (
              <div className="group-list">
                {summary?.groups.map((group) => (
                  <button className="group-row" key={group.key} type="button" onClick={() => drillInto(group)}>
                    <span className="group-main">
                      <span className="group-name">{group.key}</span>
                      <span className="group-detail">
                        {group.count.toLocaleString('en-US')} rows
                        {group.position !== null && ` · net ${quantity.format(group.position)}`}
                      </span>
                    </span>
                    <span className="group-value">
                      <strong className={group.pnl < 0 ? 'negative' : ''}>
                        {compactMoney.format(group.pnl)} <small>P&L</small>
                      </strong>
                      <strong className={group.fxExposure < 0 ? 'negative' : ''}>
                        {compactMoney.format(group.fxExposure)} <small>FX</small>
                      </strong>
                    </span>
                    <ArrowUpRight className="group-arrow" size={14} />
                  </button>
                ))}
                {summary?.groups.length === 0 && <p className="empty-state">No matching groups.</p>}
                {!summary && <p className="empty-state">Calculating totals…</p>}
              </div>
            )}
          </section>

          <section className="detail-section" aria-live="polite">
            <div className="eyebrow">Trade inspection</div>
            <h2>{selectedPosition ? selectedPosition.tradeId : 'Select a position'}</h2>
            {selectedPosition ? (
              <>
                <div className="detail-identity">
                  <strong>{selectedPosition.commodity}</strong>
                  <span>{selectedPosition.book} <i>·</i> {selectedPosition.region}</span>
                </div>
                <dl className="detail-grid">
                  <Detail label="Counterparty" value={selectedPosition.counterparty} />
                  <Detail label="Instrument" value={selectedPosition.instrumentType} />
                  <Detail label="Position" value={`${quantity.format(selectedPosition.position)} ${selectedPosition.currency}`} />
                  <Detail label="Market price" value={`${selectedPosition.marketPrice.toFixed(2)} ${selectedPosition.currency}`} />
                  <Detail label="P&L · USD" value={money.format(selectedPosition.pnl)} />
                  <Detail label="FX exposure · USD" value={money.format(selectedPosition.fxExposure)} />
                  <Detail label="As of" value={selectedPosition.asOfDate} />
                </dl>
              </>
            ) : (
              <p className="detail-placeholder">Choose any row in the blotter to see its full risk profile.</p>
            )}
          </section>
        </aside>
      </section>

      <footer className="page-footer">
        <span>Corporate Risk Reporting <b>·</b> Internal view</span>
        <span>Source: risk_positions.csv</span>
      </footer>
    </main>
  )
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const allLabels: Record<string, string> = {
    Book: 'All books',
    Commodity: 'All commodities',
    Region: 'All regions',
  }
  const allLabel = allLabels[label] ?? `All ${label.toLowerCase()}s`
  const menuOptions = [{ value: '', label: allLabel }, ...options.map((option) => ({ value: option, label: option }))]
  const selectedLabel = menuOptions.find((option) => option.value === value)?.label ?? allLabel
  const listId = `facet-options-${label.toLowerCase()}`

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus()
  }, [activeIndex, open])

  function showMenu() {
    const selectedIndex = menuOptions.findIndex((option) => option.value === value)
    setActiveIndex(Math.max(0, selectedIndex))
    setOpen(true)
  }

  function moveActiveOption(nextIndex: number) {
    const boundedIndex = Math.max(0, Math.min(menuOptions.length - 1, nextIndex))
    setActiveIndex(boundedIndex)
    optionRefs.current[boundedIndex]?.focus()
  }

  return (
    <div className="facet-filter" ref={rootRef}>
      <button
        className="facet-trigger"
        type="button"
        aria-label={`${label}: ${selectedLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        ref={triggerRef}
        onClick={() => open ? setOpen(false) : showMenu()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            showMenu()
          }
        }}
      >
        <span className="facet-label">{label}</span>
        <span className="facet-value">{selectedLabel}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div className="facet-options" id={listId} role="listbox" aria-label={`${label} options`}>
          {menuOptions.map((option, index) => (
            <button
              className="facet-option"
              id={`${listId}-${index}`}
              key={option.value || 'all'}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={activeIndex === index ? 0 : -1}
              ref={(element) => { optionRefs.current[index] = element }}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
                triggerRef.current?.focus()
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveActiveOption(index + 1)
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveActiveOption(index - 1)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  moveActiveOption(0)
                } else if (event.key === 'End') {
                  event.preventDefault()
                  moveActiveOption(menuOptions.length - 1)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  setOpen(false)
                  triggerRef.current?.focus()
                }
              }}
            >
              <span className="facet-option-check">{option.value === value && <Check size={13} />}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="detail-item"><dt>{label}</dt><dd>{value}</dd></div>
}

export default App