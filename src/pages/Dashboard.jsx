import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardTitle } from '../components/ui/card.jsx'
import { listSales, listReturns, getDayOpenAt, getYesterdaySummary, isTokenClosed, getActiveBusinessDateId, getBusinessDateId } from '../utils/storage.js'
import { 
  TrendingUp, 
  Truck, 
  Percent, 
  RotateCcw, 
  BadgeCheck, 
  History, 
  Calendar, 
  LayoutDashboard,
  Wallet,
  Receipt,
  Ticket
} from 'lucide-react'

function startOfDay(ts){
  const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime()
}
function isInRange(ts, from, to){
  return ts >= from && ts <= to
}
function formatMoney(n){
  const v = isNaN(n) ? 0 : n; return `Rs.${v.toFixed(2)}`
}

export default function Dashboard() {
  const [sales, setSales] = useState([])
  const [returns, setReturns] = useState([])
  const [range, setRange] = useState('today') // today | yesterday | date | last7 | month | all | custom
  const [dateOnly, setDateOnly] = useState('') // yyyy-mm-dd for 'date' range
  const [customFrom, setCustomFrom] = useState('') // yyyy-mm-dd
  const [customTo, setCustomTo] = useState('')
  const [yesterday, setYesterday] = useState(getYesterdaySummary())
  const [isMobile, setIsMobile] = useState(false)
  const dateRef = useRef(null)
  const fromRef = useRef(null)
  const toRef = useRef(null)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(()=>{
    const load = () => {
      setSales(listSales())
      setReturns(listReturns())
      setYesterday(getYesterdaySummary())
    }
    load()
    try { setDateOnly(new Date().toISOString().slice(0,10)) } catch {}

    window.addEventListener('data:sales-changed', load)
    window.addEventListener('data:returns-changed', load)
    window.addEventListener('storage', load)
    window.addEventListener('day:status-changed', load)
    return () => {
      window.removeEventListener('data:sales-changed', load)
      window.removeEventListener('data:returns-changed', load)
      window.removeEventListener('storage', load)
      window.removeEventListener('day:status-changed', load)
    }
  },[])

  // Lightweight polling to reflect Day Close/Open changes immediately on the dashboard
  useEffect(()=>{
    const id = setInterval(()=>{
      // Update yesterday snapshot and trigger a re-render
      setYesterday(getYesterdaySummary())
    }, 2000)
    return () => clearInterval(id)
  },[])

  // Date range calculation
  const { from, to } = useMemo(()=>{
    const now = new Date()
    const todayStart = startOfDay(now)
    const oneDay = 24*60*60*1000
    switch(range){
      case 'today': return { from: todayStart, to: todayStart + oneDay - 1 }
      case 'yesterday': return { from: todayStart - oneDay, to: todayStart - 1 }
      case 'date': {
        if (!dateOnly) return { from: todayStart, to: todayStart + oneDay - 1 }
        const d = new Date(dateOnly + 'T00:00:00')
        const s = d.getTime(); return { from: s, to: s + oneDay - 1 }
      }
      case 'last7': return { from: todayStart - 6*oneDay, to: todayStart + oneDay - 1 }
      case 'month': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1)
        return { from: d.getTime(), to: todayStart + oneDay - 1 }
      }
      case 'custom': {
        const f = customFrom ? new Date(customFrom + 'T00:00:00').getTime() : 0
        const t = customTo ? new Date(customTo + 'T23:59:59').getTime() : Date.now()
        return { from: f, to: t }
      }
      default: return { from: 0, to: Date.now() }
    }
  },[range, dateOnly, customFrom, customTo])

  // Apply business Open Day floor: hide data before opening time if set
  const openedAt = getDayOpenAt()
  const effectiveFrom = Math.max(from, openedAt || 0)

  // Filtered sales & returns
  const filteredSales = useMemo(()=> sales.filter(s => isInRange(s.createdAt||0, effectiveFrom, to)), [sales, effectiveFrom, to])
  const filteredReturns = useMemo(()=> returns.filter(r => isInRange(r.createdAt||0, effectiveFrom, to)), [returns, effectiveFrom, to])

  // KPIs for Today (live). If day is closed, show zeros to indicate reset until re-open.
  const kpisToday = useMemo(()=>{
    const closed = isTokenClosed()
    if (closed) return { subtotal: 0, deliveryCharges: 0, gross: 0, discount: 0, returned: 0, netAfterReturns: 0, returnsCount: 0, tokensGenerated: 0 }
    const subtotal = filteredSales.reduce((sum, s) => sum + (Number(s.subtotal)||0), 0)
    const deliveryCharges = filteredSales.reduce((sum, s) => sum + (Number(s.deliveryCharges)||0), 0)
    const gross = subtotal + deliveryCharges
    const discount = filteredSales.reduce((sum, s) => sum + (Number(s.discountAmount)||0), 0)
    const returned = filteredReturns.reduce((sum, r) => sum + (Number(r.total)||0), 0)
    const netAfterReturns = Math.max(0, gross - discount - returned)
    const returnsCount = filteredReturns.length
    const tokensGenerated = filteredSales.length
    return { subtotal, deliveryCharges, gross, discount, returned, netAfterReturns, returnsCount, tokensGenerated }
  },[filteredSales, filteredReturns])

  // Build daily series for multi-day chart
  const series = useMemo(()=>{
    // Group by day (YYYY-MM-DD)
    const map = new Map()
    filteredSales.forEach(s => {
      const d = new Date(s.createdAt||0); const key = d.toISOString().slice(0,10)
      const prev = map.get(key) || 0
      map.set(key, prev + (Number(s.total)||0))
    })
    // Sort by date
    return Array.from(map.entries()).sort((a,b)=>a[0] < b[0] ? -1 : 1)
  },[filteredSales])

  const maxVal = Math.max(1, ...series.map(([,v])=>v))

  return (
    <section className="page dashboard-page">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-title">
          <h1 className="dashboard-title">
            <LayoutDashboard size={24} style={{ color: 'var(--primary)' }} />
            <span>Dashboard Overview</span>
          </h1>
          <p className="dashboard-subtitle">Monitor your restaurant's performance and sales metrics in real-time.</p>
        </div>
        <div className="dashboard-header-actions">
          <button
            type="button"
            className="btn icon-btn"
            onClick={() => window.location.reload()}
            title="Refresh dashboard data"
            style={{ borderRadius: 10, height: 38, width: 38 }}
          >
            <RotateCcw size={16} />
          </button>
          <div className="biz-date-badge">
            <span>Business Date:</span>
            <b>{getActiveBusinessDateId()}</b>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="dashboard-filter-card">
        <div className="dashboard-filter-content">
          <div className="dashboard-filter-left">
            <div className="dashboard-filter-icon">
              <Calendar size={18} />
            </div>
            <div className="dashboard-filter-select-group">
              <label>Analytical Range</label>
              <select className="dashboard-filter-select" value={range} onChange={e=>setRange(e.target.value)}>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="date">Specific Date</option>
                <option value="last7">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {(range==='date' || range==='custom') && (
              <div className="dashboard-filter-dates">
                {range==='date' && (
                  <div className="input-wrap dashboard-filter-date-input">
                    <input ref={dateRef} className="input" type="date" value={dateOnly} onChange={e=>setDateOnly(e.target.value)} style={{height:38, fontSize:13}} />
                  </div>
                )}
                {range==='custom' && (
                  <>
                    <div className="input-wrap dashboard-filter-date-input">
                      <input ref={fromRef} className="input" type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{height:38, fontSize:13}} />
                    </div>
                    <span className="muted" style={{fontSize:12, fontWeight:600}}>to</span>
                    <div className="input-wrap dashboard-filter-date-input">
                      <input ref={toRef} className="input" type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{height:38, fontSize:13}} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-kpi-grid">
        <KPICard
          title="Gross Sales"
          value={formatMoney(kpisToday.gross)}
          icon={<TrendingUp size={20} />}
          bg="linear-gradient(135deg, rgba(225,29,72,0.95) 0%, rgba(190,18,60,0.95) 100%)"
        />
        <KPICard
          title="Net Profit"
          value={formatMoney(kpisToday.netAfterReturns)}
          icon={<Wallet size={20} />}
          bg="linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.95) 100%)"
        />
        <KPICard
          title="Refunded (Loss)"
          value={formatMoney(kpisToday.returned)}
          icon={<RotateCcw size={20} />}
          bg="linear-gradient(135deg, rgba(239,68,68,0.95) 0%, rgba(185,28,28,0.95) 100%)"
        />
        <KPICard
          title="Discounts"
          value={formatMoney(kpisToday.discount)}
          icon={<Percent size={20} />}
          bg="linear-gradient(135deg, rgba(249,115,22,0.95) 0%, rgba(194,65,12,0.95) 100%)"
        />
        <KPICard
          title="Delivery Charges"
          value={formatMoney(kpisToday.deliveryCharges)}
          icon={<Truck size={20} />}
          bg="linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(79,70,229,0.95) 100%)"
        />
        <KPICard
          title="Tokens Generated"
          value={kpisToday.tokensGenerated}
          icon={<Ticket size={20} />}
          bg="linear-gradient(135deg, rgba(14,165,233,0.95) 0%, rgba(2,132,199,0.95) 100%)"
        />
      </div>

      {/* Main Insights Grid (Charts) */}
      <div className="dashboard-insights-grid">
        {/* Sales Performance Chart */}
        <div className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <div className="dashboard-chart-title">
              <History size={18} style={{color:'var(--primary)'}} />
              <span>Sales Performance</span>
            </div>
            <div className="muted" style={{fontSize:11, fontWeight:600}}>Values in PKR</div>
          </div>

          <div className="dashboard-chart-body">
            {range === 'today' || range === 'yesterday' || range === 'date' ? (
              <div className="chart-scroll-container">
                {(() => {
                  // Group sales by business date (bizId)
                  const bizDateMap = new Map()
                  sales.forEach(s => {
                    const bizId = s.bizId || getBusinessDateId(s.createdAt || 0)
                    const prev = bizDateMap.get(bizId) || 0
                    bizDateMap.set(bizId, prev + (Number(s.total) || 0))
                  })

                  const sel = new Date(effectiveFrom)
                  const y = sel.getFullYear(); const m = sel.getMonth()
                  const daysInMonth = new Date(y, m+1, 0).getDate()

                  const bizDates = Array.from({length: daysInMonth}, (_,i)=>{
                    const day = i+1
                    const bizId = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                    return { day, bizId, total: bizDateMap.get(bizId) || 0 }
                  })

                  const maxM = Math.max(1, ...bizDates.map(b => b.total))
                  const barWidth = 12
                  const barSpacing = 22
                  const chartWidth = Math.max(340, daysInMonth * barSpacing + 50)
                  const chartHeight = 240
                  const baseLineY = 200
                  const maxBarHeight = 150

                  return (
                    <svg width={chartWidth} height={chartHeight} style={{display:'block', margin:'0 auto'}}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#be123c" />
                        </linearGradient>
                      </defs>
                      {/* Horizontal grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map(p => (
                        <line key={p} x1="30" y1={baseLineY - p*maxBarHeight} x2={chartWidth-15} y2={baseLineY - p*maxBarHeight} stroke="var(--border-subtle)" strokeDasharray="3" />
                      ))}

                      {bizDates.map(({day, total}, idx) => {
                        const x = 35 + idx * barSpacing
                        const barH = Math.max(total > 0 ? 4 : 1, maxBarHeight * (total / maxM))
                        const yBar = baseLineY - barH
                        return (
                          <g key={idx}>
                            <rect x={x} y={yBar} width={barWidth} height={barH} fill="url(#barGrad)" rx="3" opacity={total > 0 ? 1 : 0.2} />
                            {idx % 2 === 0 && <text x={x + barWidth/2} y={baseLineY + 16} textAnchor="middle" fontSize={9} fill="var(--muted)" fontWeight="600">{day}</text>}
                            {total > 0 && barH > 18 && (
                              <text x={x + barWidth/2} y={yBar - 6} textAnchor="middle" fontSize={8} fill="var(--text)" fontWeight="700">
                                {Math.round(total/1000)}k
                              </text>
                            )}
                          </g>
                        )
                      })}
                      <line x1="30" y1={baseLineY} x2={chartWidth-15} y2={baseLineY} stroke="var(--border)" strokeWidth="1.5" />
                    </svg>
                  )
                })()}
              </div>
            ) : (
              <div className="chart-scroll-container">
                {series.length === 0 ? (
                  <div className="muted" style={{height: 200, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 13}}>
                    No sales data recorded for this range
                  </div>
                ) : (
                  (() => {
                    const barWidth = 28
                    const colWidth = 56
                    const chartWidth = Math.max(340, series.length * colWidth + 60)
                    const chartHeight = 240
                    const baseLineY = 190
                    const maxBarHeight = 140

                    return (
                      <svg width={chartWidth} height={chartHeight} style={{display:'block', margin:'0 auto'}}>
                        {[0, 0.25, 0.5, 0.75, 1].map(p => (
                          <line key={p} x1="35" y1={baseLineY - p*maxBarHeight} x2={chartWidth-15} y2={baseLineY - p*maxBarHeight} stroke="var(--border-subtle)" strokeDasharray="3" />
                        ))}
                        {series.map(([date, val], idx) => {
                          const x = 45 + idx * colWidth
                          const h = Math.max(4, maxBarHeight * (val / maxVal))
                          const y = baseLineY - h
                          return (
                            <g key={date}>
                              <rect x={x} y={y} width={barWidth} height={h} fill="var(--primary)" rx="4" />
                              <text x={x + barWidth/2} y={y - 6} textAnchor="middle" fontSize={9} fill="var(--text)" fontWeight="700">
                                {Math.round(val/1000)}k
                              </text>
                              <text x={x + barWidth/2} y={baseLineY + 16} textAnchor="middle" fontSize={9} fill="var(--muted)" fontWeight="600">
                                {date.slice(5)}
                              </text>
                            </g>
                          )
                        })}
                        <line x1="35" y1={baseLineY} x2={chartWidth-15} y2={baseLineY} stroke="var(--border)" strokeWidth="1.5" />
                      </svg>
                    )
                  })()
                )}
              </div>
            )}
          </div>
        </div>

        {/* Revenue Breakdown (Donut Chart) */}
        <div className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <div className="dashboard-chart-title">
              <Percent size={18} style={{color:'var(--primary)'}} />
              <span>Revenue Breakdown</span>
            </div>
            <div className="muted" style={{fontSize:11, fontWeight:600}}>Live Share</div>
          </div>

          <div className="dashboard-chart-body">
            <div className="donut-center-wrap">
              {(() => {
                const gross = kpisToday.gross
                const discount = kpisToday.discount
                const returned = kpisToday.returned
                const totalVal = Math.max(1, gross)
                const r = 68
                const cx = 100
                const cy = 100
                const C = 2 * Math.PI * r
                const seg = (v) => Math.max(0, Math.min(C, (v/totalVal)*C))
                const discLen = seg(discount)
                const retLen = seg(returned)
                const netLen = seg(Math.max(0, gross - discount - returned))

                return (
                  <svg width="200" height="200" viewBox="0 0 200 200" style={{maxWidth:'100%', height:'auto'}}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={18} />
                    {discLen > 0 && (
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f97316" strokeWidth={18} strokeDasharray={`${discLen} ${C-discLen}`} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
                    )}
                    {retLen > 0 && (
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={18} strokeDasharray={`${retLen} ${C-retLen}`} transform={`rotate(${(discLen/C)*360 - 90} ${cx} ${cy})`} strokeLinecap="round" />
                    )}
                    {netLen > 0 && (
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth={18} strokeDasharray={`${netLen} ${C-netLen}`} transform={`rotate(${((discLen+retLen)/C)*360 - 90} ${cx} ${cy})`} strokeLinecap="round" />
                    )}
                    <g transform={`translate(${cx}, ${cy})`}>
                      <text textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight="800" fill="var(--text)">NET</text>
                      <text y={16} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="var(--muted)" fontWeight="600">Revenue</text>
                    </g>
                  </svg>
                )
              })()}
            </div>

            <div className="donut-legend-grid">
              <LegendItem color="#10b981" label="Net Revenue" value={formatMoney(Math.max(0, kpisToday.gross - kpisToday.discount - kpisToday.returned))} />
              <LegendItem color="#ef4444" label="Refunded" value={formatMoney(kpisToday.returned)} />
              <LegendItem color="#f97316" label="Discount" value={formatMoney(kpisToday.discount)} />
              <LegendItem color="var(--primary)" label="Gross Sales" value={formatMoney(kpisToday.gross)} />
            </div>
          </div>
        </div>
      </div>

      {/* Yesterday Closing Snapshot */}
      <div className="snapshot-card">
        <div className="dashboard-chart-header" style={{marginBottom: 8}}>
          <div className="dashboard-chart-title">
            <History size={18} style={{color:'var(--primary)'}} />
            <span>Yesterday's Closing Snapshot</span>
          </div>
          <div className="muted" style={{fontSize:11, fontWeight:600}}>Comparative Benchmark</div>
        </div>

        <div className="snapshot-grid">
          <MiniStat label="Sales (Gross)" value={formatMoney(yesterday?.gross || 0)} />
          <MiniStat label="Net Profit" value={formatMoney(yesterday?.net || 0)} />
          <MiniStat label="Refunds" value={formatMoney(yesterday?.returned || 0)} />
          <MiniStat label="Discounts" value={formatMoney(yesterday?.discount || 0)} />
          <MiniStat label="Total Orders" value={yesterday?.tokensGenerated || 0} />
        </div>
      </div>
    </section>
  )
}

function KPICard({ title, value, icon, bg }) {
  return (
    <div className="dashboard-kpi-card" style={{ background: bg }}>
      <div className="dashboard-kpi-top">
        <span className="dashboard-kpi-title">{title}</span>
        <span className="dashboard-kpi-icon">{icon}</span>
      </div>
      <div className="dashboard-kpi-value">{value}</div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="snapshot-item">
      <div className="snapshot-item-label">{label}</div>
      <div className="snapshot-item-val">{value}</div>
    </div>
  )
}

function LegendItem({ color, label, value }) {
  return (
    <div className="legend-badge">
      <div className="legend-badge-dot" style={{ background: color }} />
      <div className="legend-badge-text">
        <span className="legend-badge-label">{label}</span>
        <span className="legend-badge-val">{value}</span>
      </div>
    </div>
  )
}
