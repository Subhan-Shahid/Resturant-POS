import { useEffect, useState } from 'react'
import { getDayOpenAt, isTokenClosed, openDay, getActiveBusinessDateId, getDayCloseAt } from '../utils/storage.js'

export default function DayOpen(){
  const [openedAt, setOpenedAt] = useState(0)
  const [closed, setClosed] = useState(false)
  const [closedAt, setClosedAt] = useState(0)

  useEffect(()=>{
    try { setOpenedAt(getDayOpenAt()||0) } catch {}
    try { setClosed(isTokenClosed()) } catch {}
    try { setClosedAt(getDayCloseAt()||0) } catch {}
  },[])

  const openNow = () => {
    try {
      openDay()
      setOpenedAt(getDayOpenAt()||0)
      setClosed(isTokenClosed())
      setClosedAt(0)
    } catch {}
  }

  const status = (()=>{
    if (openedAt && !closed) return 'open'
    return 'closed'
  })()

  return (
    <section className="page">
      <h1>Day Open</h1>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div className="muted">Current Business Date</div>
          <div><b>{getActiveBusinessDateId()}</b></div>
        </div>
        <div className="row" style={{justifyContent:'space-between'}}>
          <div className="muted">Status</div>
          <div><b style={{textTransform:'capitalize'}}>{status}</b></div>
        </div>
        {openedAt ? (
          <div className="row" style={{justifyContent:'space-between'}}>
            <div className="muted">Opened At</div>
            <div><b>{new Date(openedAt).toLocaleString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</b></div>
          </div>
        ) : (
          <div className="muted">Day not opened yet.</div>
        )}
        {closed && closedAt ? (
          <div className="row" style={{justifyContent:'space-between'}}>
            <div className="muted">Closed At</div>
            <div><b>{new Date(closedAt).toLocaleString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</b></div>
          </div>
        ) : null}
        <div className="actions" style={{marginTop:12}}>
          <button className="btn primary" onClick={openNow} disabled={status==='open'}>Open Day</button>
        </div>
      </div>
    </section>
  )
}
