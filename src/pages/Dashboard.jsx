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
  const dateRef = useRef(null)
  const fromRef = useRef(null)
  const toRef = useRef(null)

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

  // Removed monthly calendar heatmaps (tokens/returns) per request

  return (
    <section className="page dashboard-page">
      <div className="dashboard-header" style={{marginBottom: 20}}>
        <div>
          <h1 className="page-title dashboard-title" style={{display:'flex', alignItems:'center', gap:12, marginBottom:4}}>
            <LayoutDashboard size={28} />
            <span>Dashboard Overview</span>
          </h1>
          <p className="dashboard-subtitle">Monitor your restaurant's performance and sales metrics in real-time.</p>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
           <button 
            className="btn icon-btn" 
            onClick={() => window.location.reload()} 
            title="Refresh dashboard data"
            style={{background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)'}}
           >
            <RotateCcw size={18} />
           </button>
           <div className="muted" style={{fontSize:13, background:'rgba(255,255,255,0.05)', padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)'}}>
            Business Date: <b style={{color:'var(--primary)'}}>{getActiveBusinessDateId()}</b>
           </div>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns: '1fr', gap: 20}}>
        {/* Filter Section */}
        <Card className="dashboard-filter-card" style={{background: 'var(--panel)', border: '1px solid var(--border)'}}>
          <CardContent className="p-4" style={{paddingBottom: 16}}>
            <div className="row" style={{justifyContent:'space-between', flexWrap:'wrap', gap:16}}>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <div style={{background:'rgba(255,0,0,0.1)', color:'var(--primary)', padding:8, borderRadius:8}}>
                  <Calendar size={20} />
                </div>
                <div style={{display:'flex', flexDirection:'column'}}>
                  <span className="muted" style={{fontSize:11, fontWeight:600, textTransform:'uppercase'}}>Analytical Range</span>
                  <select className="input" value={range} onChange={e=>setRange(e.target.value)} style={{width:180, border:'none', background:'transparent', paddingLeft:0, fontWeight:600, fontSize:15}}>
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
                  <div className="row" style={{gap:12, marginLeft:12, paddingLeft:12, borderLeft:'1px solid var(--border)'}}>
                    {range==='date' && (
                      <div className="input-wrap" style={{minWidth:160}}>
                        <input ref={dateRef} className="input" type="date" value={dateOnly} onChange={e=>setDateOnly(e.target.value)} style={{height:38}} />
                      </div>
                    )}
                    {range==='custom' && (
                      <>
                        <div className="input-wrap" style={{minWidth:150}}>
                          <input ref={fromRef} className="input" type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{height:38}} />
                        </div>
                        <span className="muted">to</span>
                        <div className="input-wrap" style={{minWidth:150}}>
                          <input ref={toRef} className="input" type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{height:38}} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Grid */}
        <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16}}>
          <KPICard 
            title="Gross Sales" 
            value={formatMoney(kpisToday.gross)} 
            icon={<TrendingUp size={24} />} 
            bg="linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)"
          />
          <KPICard 
            title="Net Profit" 
            value={formatMoney(kpisToday.netAfterReturns)} 
            icon={<Wallet size={24} />} 
            bg="linear-gradient(135deg, #171717 0%, #262626 100%)"
            highlight
          />
          <KPICard 
            title="Refunded" 
            value={formatMoney(kpisToday.returned)} 
            icon={<RotateCcw size={24} />} 
            bg="linear-gradient(135deg, #450a0a 0%, #991b1b 100%)"
          />
          <KPICard 
            title="Discounts" 
            value={formatMoney(kpisToday.discount)} 
            icon={<Percent size={24} />} 
            bg="linear-gradient(135deg, #171717 0%, #404040 100%)"
          />
          <KPICard 
            title="Delivery" 
            value={formatMoney(kpisToday.deliveryCharges)} 
            icon={<Truck size={24} />} 
            bg="linear-gradient(135deg, #450a0a 0%, #b91c1c 100%)"
          />
          <KPICard 
            title="Token Count" 
            value={kpisToday.tokensGenerated} 
            icon={<Ticket size={24} />} 
            bg="linear-gradient(135deg, #171717 0%, #525252 100%)"
          />
        </div>

        {/* Main Insights Grid */}
        <div className="grid2" style={{gap: 20, alignItems: 'start'}}>
          {/* Sales Chart */}
          <Card style={{background: 'var(--panel)', border: '1px solid var(--border)', minHeight: 400}}>
            <CardContent className="p-6">
              <div className="row" style={{justifyContent:'space-between', marginBottom: 24}}>
                <CardTitle style={{fontSize:18, display:'flex', alignItems:'center', gap:8}}>
                  <History size={20} style={{color:'var(--primary)'}} />
                  <span>Sales performance</span>
                </CardTitle>
                <div className="muted" style={{fontSize:12}}>Values in PKR</div>
              </div>
              
              {range === 'today' || range === 'yesterday' || range === 'date' ? (
                 <div style={{height: 300, display:'flex', flexDirection:'column', justifyContent:'center'}}>
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
                      const barWidth = 14
                      const barSpacing = 28
                      const width = Math.max(500, daysInMonth * barSpacing + 40)
                      return (
                        <div style={{width:'100%', overflowX:'auto', paddingBottom:10}}>
                          <svg width={width} height={260} style={{display:'block', margin:'0 auto'}}>
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ff4444" />
                                <stop offset="100%" stopColor="#ff0000" />
                              </linearGradient>
                            </defs>
                            {/* Horizontal grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map(p => (
                              <line key={p} x1="30" y1={210 - p*170} x2={width-10} y2={210 - p*170} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                            ))}
                            
                            {bizDates.map(({day, bizId, total}, idx) => {
                              const x = 40 + idx * barSpacing
                              const barH = Math.max(2, 170 * (total / maxM))
                              const yBar = 210 - barH
                              return (
                                <g key={idx}>
                                  <rect x={x} y={yBar} width={barWidth} height={barH} fill="url(#barGrad)" rx="2" />
                                  {idx % 2 === 0 && <text x={x + barWidth/2} y={230} textAnchor="middle" fontSize="10" fill="#666">{day}</text>}
                                  {total > 0 && barH > 20 && <text x={x + barWidth/2} y={yBar - 6} textAnchor="middle" fontSize="8" fill="#fff" fontWeight="600">{Math.round(total/1000)}k</text>}
                                </g>
                              )
                            })}
                            <line x1="30" y1="210" x2={width-10} y2="210" stroke="#333" />
                          </svg>
                        </div>
                      )
                    })()}
                 </div>
              ) : (
                <div style={{height: 300}}>
                   {series.length === 0 ? (
                    <div className="muted" style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>No data available for this range</div>
                  ) : (
                    <div style={{width:'100%', overflowX:'auto'}}>
                      <svg width={Math.max(500, series.length*70)} height={260}>
                         {/* Horizontal grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map(p => (
                          <line key={p} x1="40" y1={200 - p*160} x2={Math.max(500, series.length*70)} y2={200 - p*160} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                        ))}
                        {series.map(([date, val], idx) => {
                          const x = 60 + idx*60
                          const h = Math.max(4, 160 * (val / maxVal))
                          const y = 200 - h
                          return (
                            <g key={date}>
                              <rect x={x} y={y} width="32" height={h} fill="var(--primary)" rx="4" />
                              <text x={x+16} y={y-8} textAnchor="middle" fontSize="10" fill="#fff">{Math.round(val/1000)}k</text>
                              <text x={x+16} y={220} textAnchor="middle" fontSize="10" fill="#a3a3a3">{date.slice(5)}</text>
                            </g>
                          )
                        })}
                        <line x1="40" y1="200" x2={Math.max(500, series.length*70)} y2="200" stroke="#333" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribution Chart */}
          <Card style={{background: 'var(--panel)', border: '1px solid var(--border)', minHeight: 400}}>
            <CardContent className="p-6">
              <CardTitle style={{fontSize:18, display:'flex', alignItems:'center', gap:8, marginBottom: 24}}>
                <Percent size={20} style={{color:'var(--primary)'}} />
                <span>Revenue Breakdown</span>
              </CardTitle>
              
              <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:240}}>
                {(() => {
                  const gross = kpisToday.gross
                  const discount = kpisToday.discount
                  const returned = kpisToday.returned
                  const totalVal = Math.max(1, gross)
                  const r = 80, cx = 110, cy = 110, C = 2*Math.PI*r
                  const seg = (v) => Math.max(0, Math.min(C, (v/totalVal)*C))
                  const discLen = seg(discount)
                  const retLen = seg(returned)
                  const netLen = seg(Math.max(0, gross - discount - returned))
                  return (
                    <svg width="220" height="220" viewBox={`0 0 ${cx*2} ${cy*2}`}>
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#262626" strokeWidth="22" />
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#7f1d1d" strokeWidth="22" strokeDasharray={`${discLen} ${C-discLen}`} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="22" strokeDasharray={`${retLen} ${C-retLen}`} transform={`rotate(${(discLen/C)*360 - 90} ${cx} ${cy})`} strokeLinecap="round" />
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff" strokeWidth="22" strokeDasharray={`${netLen} ${C-netLen}`} transform={`rotate(${((discLen+retLen)/C)*360 - 90} ${cx} ${cy})`} strokeLinecap="round" />
                      <g transform={`translate(${cx}, ${cy})`}>
                        <text textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#fff">NET</text>
                        <text y="20" textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#a3a3a3">Revenue</text>
                      </g>
                    </svg>
                  )
                })()}
              </div>

              <div style={{marginTop: 20, display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12}}>
                <LegendItem color="#ffffff" label="Net Revenue" value={formatMoney(Math.max(0, kpisToday.gross - kpisToday.discount - kpisToday.returned))} />
                <LegendItem color="#ef4444" label="Refunded" value={formatMoney(kpisToday.returned)} />
                <LegendItem color="#7f1d1d" label="Discount" value={formatMoney(kpisToday.discount)} />
                <LegendItem color="#262626" label="Other" value="Rs.0.00" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Yesterday Snapshot */}
        <Card style={{background: 'linear-gradient(to right, #0a0a0a, #111)', border: '1px solid var(--border)'}}>
          <CardContent className="p-4">
            <div className="row" style={{justifyContent:'space-between', marginBottom: 12}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{background:'rgba(255,255,255,0.05)', padding:8, borderRadius:8}}>
                  <History size={18} />
                </div>
                <CardTitle style={{fontSize:16, margin:0}}>Yesterday's closing snapshot</CardTitle>
              </div>
              <div style={{fontSize:12, color:'var(--muted)'}}>Comparative metrics</div>
            </div>
            
            <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12}}>
              <MiniStat label="Sales" value={formatMoney(yesterday.gross||0)} />
              <MiniStat label="Net" value={formatMoney(yesterday.net||0)} />
              <MiniStat label="Refund" value={formatMoney(yesterday.returned||0)} />
              <MiniStat label="Discount" value={formatMoney(yesterday.discount||0)} />
              <MiniStat label="Orders" value={yesterday.tokensGenerated||0} />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function KPICard({ title, value, icon, bg, highlight }) {
  return (
    <div className="kpi" style={{
      background: bg, 
      padding: '20px', 
      borderRadius: '20px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      border: highlight ? '1px solid rgba(255,255,255,0.1)' : 'none',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
        <div style={{fontSize: 14, fontWeight: 500, opacity: 0.8}}>{title}</div>
        <div style={{opacity: 0.3}}>{icon}</div>
      </div>
      <div style={{fontSize: 32, fontWeight: 800, marginTop: 12}}>{value}</div>
      {highlight && (
        <div style={{
          position: 'absolute', 
          right: '-20px', 
          bottom: '-20px', 
          width: '100px', 
          height: '100px', 
          background: 'rgba(255,0,0,0.05)', 
          borderRadius: '50%',
          filter: 'blur(30px)'
        }} />
      )}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)'}}>
      <div className="muted" style={{fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4}}>{label}</div>
      <div style={{fontSize: 14, fontWeight: 700}}>{value}</div>
    </div>
  )
}

function LegendItem({ color, label, value }) {
  return (
    <div className="row" style={{gap: 8, alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8}}>
      <div style={{width: 8, height: 8, background: color, borderRadius: 2}} />
      <div style={{display:'flex', flexDirection:'column'}}>
        <span style={{fontSize: 10, color: 'var(--muted)', fontWeight: 600}}>{label}</span>
        <span style={{fontSize: 12, fontWeight: 700}}>{value}</span>
      </div>
    </div>
  )
}
