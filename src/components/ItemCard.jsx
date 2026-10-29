import { useConfirm } from './ConfirmProvider.jsx'

export default function ItemCard({ item, onEdit, onDelete, readOnly = false, onClick, hideEdit = false, variant = 'default', showAddButton = false, onAdd }) {
  const confirm = useConfirm?.()
  const handleDelete = async () => {
    if (!onDelete) return
    let ok = true
    if (confirm) {
      ok = await confirm({
        title: 'Delete Item',
        description: 'Are you sure you want to delete this?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      })
    }
    if (ok) onDelete(item.id)
  }
  const isPos = variant === 'pos'
  if (isPos) {
    return (
      <div className={`card item-card-pos ${onClick ? 'clickable' : ''}`} onClick={onClick}>
        <div className="thumb-wrap">
          {item.categoryLabel && (
            <span style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(10, 13, 20, 0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              zIndex: 2,
            }}>
              {item.categoryLabel}
            </span>
          )}
          {item.img ? (
            <img className="thumb" src={item.img} alt={item.name} onError={(e)=>{e.currentTarget.style.display='none'}} />
          ) : (
            <div className="thumb" style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:12,fontWeight:600}}>No Image</div>
          )}
        </div>
        <div className="item-footer">
          <div className="item-meta">
            <div className="item-name">{item.name}</div>
            <div className="item-type">{item.type || '—'}</div>
          </div>
          <div className="item-actions">
            <div className="price">Rs. {item.price.toFixed(2)}</div>
            {showAddButton && (
              <button className="add-btn" title="Add to Order" onClick={(e)=>{ e.stopPropagation(); onAdd?.(item) }}>+</button>
            )}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={`card ${onClick ? 'clickable' : ''}`} onClick={onClick} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        {item.img && (
          <div className="thumb-wrap" style={{ width: '100%', height: 140, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
            <img className="thumb" src={item.img} alt={item.name} onError={(e)=>{e.currentTarget.style.display='none'}} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div className="card-title" style={{ fontSize: 16 }}>{item.name}</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{item.type || '—'}</div>
        <div className="price" style={{ fontSize: 16 }}>Rs. {item.price.toFixed(2)}</div>
      </div>
      {!readOnly && (
        <div className="actions" onClick={(e)=>e.stopPropagation()} style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {!hideEdit && <button className="btn" style={{ flex: 1 }} onClick={() => onEdit?.(item)}>Edit</button>}
          <button className="btn danger" style={{ flex: 1 }} onClick={handleDelete}>Delete</button>
        </div>
      )}
    </div>
  )
}
