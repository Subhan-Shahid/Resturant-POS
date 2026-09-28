import { useEffect, useMemo, useState } from 'react'
import SearchBar from '../components/SearchBar.jsx'
import CategoryTabs from '../components/CategoryTabs.jsx'
import ItemCard from '../components/ItemCard.jsx'
import { listItems, searchItems, updateItem, deleteItem, setBill, nextToken, getRestaurantInfo, addSale, getLastToken, setLastToken, isTokenClosed, getActiveBusinessDateId, getPrinterConfig } from '../utils/storage.js'
import { useDialog } from '../components/ConfirmProvider.jsx'

export default function PosCategory({ storageKey, title }) {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([]) // {id, name, price, qty}
  const [customerName, setCustomerName] = useState('')
  const [tokenNumber, setTokenNumber] = useState('')
  const [orderType, setOrderType] = useState('') // '', 'dine-in', 'take-away', 'delivery'
  const [deliveryCharges, setDeliveryCharges] = useState(0)
  const [discountPct, setDiscountPct] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [finalized, setFinalized] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [receiptHtml, setReceiptHtml] = useState('')

  const dialog = useDialog()
  const [tokensClosed, setTokensClosed] = useState(() => { try { return isTokenClosed() } catch { return false } })

  useEffect(() => { setItems(listItems(storageKey)) }, [storageKey])

  // Initialize token display from last issued token so it survives refresh
  useEffect(() => {
    const last = getLastToken()
    if (last) setTokenNumber(last)
  }, [])

  useEffect(() => {
    // Update closed state on storage changes (e.g., after Day Close)
    const update = () => { try { setTokensClosed(isTokenClosed()) } catch { setTokensClosed(false) } }
    update()
    window.addEventListener('storage', update)
    return () => window.removeEventListener('storage', update)
  }, [])

  const filtered = useMemo(() => (query ? searchItems(storageKey, query) : items), [items, query, storageKey])

  const handleUpdate = (data) => {
    updateItem(storageKey, data)
    setItems(prev => prev.map(i => i.id === data.id ? { ...i, ...data } : i))
    setEditing(null)
  }
  const handleDelete = (id) => {
    deleteItem(storageKey, id)
    setItems(prev => prev.filter(i => i.id !== id))
    setCart(prev => prev.filter(r => r.id !== id))
  }

  const addToCart = (item) => {
    if (tokensClosed) { try { alert('Day is closed. New orders cannot be booked.') } catch {} return }
    setCart(prev => {
      const found = prev.find(r => r.id === item.id)
      if (found) return prev.map(r => r.id === item.id ? { ...r, qty: r.qty + 1 } : r)
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }]
    })
  }
  const changeQty = (id, qty) => {
    if (isNaN(qty) || qty < 1) qty = 1
    setCart(prev => prev.map(r => r.id === id ? { ...r, qty } : r))
  }
  const removeRow = (id) => setCart(prev => prev.filter(r => r.id !== id))
  const clearCart = (keepToken = true) => {
    setCart([])
    setCustomerName('')
    setOrderType('')
    setDeliveryCharges(0)
    setDiscountPct(0)
    setPaidAmount(0)
    setFinalized(false)
    if (!keepToken) setTokenNumber('')
  }
  const total = useMemo(() => cart.reduce((s, r) => s + r.price * r.qty, 0), [cart])
  const deliveryAmt = useMemo(() => {
    const v = parseInt(deliveryCharges || 0, 10)
    return isNaN(v) || v < 0 ? 0 : v
  }, [deliveryCharges])
  const discountAmount = useMemo(() => {
    const pct = parseInt(discountPct || 0, 10)
    if (isNaN(pct) || pct <= 0) return 0
    return Math.min(total * (pct / 100), total)
  }, [discountPct, total])
  const grandTotal = useMemo(() => {
    // Apply delivery charges to all order types
    return Math.max(0, total + deliveryAmt - discountAmount)
  }, [total, deliveryAmt, discountAmount])

  const printReceiptSilent = async (html) => {
    try {
      const content = String(html || receiptHtml || '')
      if (!content.trim()) return false
      const cfg = getPrinterConfig()
      if (!cfg || !cfg.enabled || !cfg.printerName) {
        try { alert('No printer configured. Please select a printer in Settings.') } catch {}
        return false
      }
      if (!(window.burgerPos && window.burgerPos.printSilentToPrinter)) {
        if (window.burgerPos && window.burgerPos.printWithDialog) {
          const res = await window.burgerPos.printWithDialog(content)
          return !!(res && res.success)
        }
        const w = window.open('', '_blank', 'width=400,height=600')
        if (!w) { try { alert('Pop-up blocked. Allow pop-ups and try again.') } catch {} ; return false }
        w.document.write(content); w.document.close()
        setTimeout(() => { try { w.focus(); w.print(); setTimeout(()=>w.close(), 1000) } catch {} }, 400)
        return true
      }
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(content)
      let result = await Promise.race([
        window.burgerPos.printSilentToPrinter(dataUrl, cfg.printerName),
        new Promise(resolve => setTimeout(() => resolve({ success:false, error:'Timeout' }), 6000))
      ])
      if (!(result && result.success)) {
        result = await Promise.race([
          window.burgerPos.printSilentToPrinter(content, cfg.printerName),
          new Promise(resolve => setTimeout(() => resolve({ success:false, error:'Timeout2' }), 6000))
        ])
      }
      if (result && result.success) return true
      try { alert(`Failed to print. ${result && result.error ? 'Error: ' + result.error : ''}`) } catch {}
      return false
    } catch (e) {
      try { alert(`Print error: ${e && e.message ? e.message : e}`) } catch {}
      return false
    }
  }
  
  // SVG-based HTML for silent printing (no external assets, stable on thermal drivers)
  function generateReceiptHtmlSilent({ token }) {
    try {
      const bizId = getActiveBusinessDateId()
      const rest = getRestaurantInfo()
      const esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      const items = cart.map(r => ({ name: `${r.qty} x ${r.name}`, price: (r.price * r.qty).toFixed(2) }))
      const dt = new Date().toLocaleString('en-GB', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})
      const chg = Math.max(0, Number(paidAmount||0) - Number(grandTotal||0))
      const itemsHtml = items.map(l => `<div class="row"><div>${esc(l.name)}</div><div>Rs.${l.price}</div></div>`).join('')
      return `<!DOCTYPE html><html><head><meta charset="utf-8" />
        <title>Receipt</title>
        <style>@page{size:auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000;height:auto !important;min-height:100% !important;overflow:visible !important}body{font-family:ui-monospace,Menlo,Consolas,monospace;padding:8px 8px 50mm 8px;font-weight:700;overflow:visible !important}img,svg{max-width:100%;height:auto}.center{text-align:center;font-weight:700;page-break-inside:avoid}.small{font-size:14px;line-height:1.35}.row{display:flex;justify-content:space-between;gap:8px;page-break-inside:avoid}.sep{border-top:1px dashed #000;margin:8px 0}.logo{display:block;margin:0 auto 6px;width:48mm;max-width:100%;height:auto}.tail{height:50mm}body::after{content:"";display:block;height:80mm}@media print{html,body{width:80mm;padding-bottom:50mm}}</style></head>
        <body>
          ${rest.logo ? `<img class="logo" src="${rest.logo}" alt="Logo" />` : ''}
          <div class="center" style="font-weight:900">${esc(rest.name || 'Restaurant')}</div>
          ${rest.address ? `<div class="center small" style="font-weight:900">${esc(rest.address)}</div>` : ''}
          ${rest.phone ? `<div class="center small" style="font-weight:900">${esc(rest.phone)}</div>` : ''}
          <div class="center small" style="font-weight:900">Business Date: ${esc(bizId)}</div>
          <div class="sep"></div>
          <div class="row"><div>Customer</div><div>${esc(customerName || 'Walk-in')}</div></div>
          <div class="row"><div>Token</div><div>${esc(token)}</div></div>
          <div class="row"><div>Order Type</div><div>${esc(orderType || 'Take-Away')}</div></div>
          <div class="row"><div>Date & Time</div><div>${esc(dt)}</div></div>
          <div class="sep"></div>
          ${itemsHtml}
          <div class="sep"></div>
          <div class="row"><div>Subtotal</div><div>Rs.${Number(total||0).toFixed(2)}</div></div>
          ${deliveryAmt > 0 ? `<div class="row"><div><b>Delivery Charges</b></div><div>Rs.${Number(deliveryAmt||0).toFixed(2)}</div></div>` : ''}
          ${Number(discountAmount||0) > 0 ? `<div class="row"><div><b>Discount</b></div><div>-Rs.${Number(discountAmount||0).toFixed(2)}</div></div>` : ''}
          <div class="row"><div><b>Total</b></div><div><b>Rs.${Number(grandTotal||0).toFixed(2)}</b></div></div>
          ${Number(paidAmount||0) > 0 ? `<div class="row"><div><b>Paid</b></div><div>Rs.${Number(paidAmount||0).toFixed(2)}</div></div>` : ''}
          ${chg > 0 ? `<div class="row"><div><b>Change</b></div><div>Rs.${chg.toFixed(2)}</div></div>` : ''}
          <div class="sep"></div>
          <div class="center small" style="font-weight:900">Thank you for your order!</div>
          <div class="center small" style="font-weight:900">software developed by DevOra contact:03396405272</div>
          <div class="tail"></div>
        </body></html>`
    } catch (e) {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial; width:68mm; margin:0 auto; padding:6mm 4mm">Receipt Error. Token ${token}</body></html>`
    }
  }

  const handleOkDone = async () => {
    if (tokensClosed) { try { alert('Day is closed. Processing payments is disabled until reopened.') } catch {} return }
    if (cart.length === 0) return
    
    const mapped = cart.map(r => ({ ...r, category: storageKey }))
    setBill(mapped)
    // Generate a new token only at payment time
    const tk = nextToken()
    setTokenNumber(tk)
    setLastToken(tk)
    setFinalized(true)
    
    // Save sale record
    addSale({
      token: tk,
      items: mapped,
      total: grandTotal,
      subtotal: total,
      discount: discountAmount,
      discountPct,
      deliveryCharges: deliveryAmt,
      customerName: customerName || 'Walk-in',
      orderType: orderType || 'Take-Away',
      paidAmount,
      createdAt: Date.now(),
    })
    
    // Generate receipt HTML and show preview
    console.log('Generating receipt HTML for token:', tk)
    const receiptData = generateReceiptHtml({ token: tk })
    console.log('Generated receipt HTML length:', receiptData ? receiptData.length : 0)
    console.log('Receipt HTML preview:', receiptData ? receiptData.substring(0, 200) + '...' : 'EMPTY')
    setReceiptHtml(receiptData)
    // Use minimal inline-styled HTML for silent printing to avoid blank pages
    const silentHtml = generateReceiptHtmlSilent({ token: tk })
    const printed = await printReceiptSilent(silentHtml)
    if (printed) {
      clearCart(true)
    } else {
      setShowReceiptPreview(true)
    }
  }
  
  // Generate receipt HTML
  function generateReceiptHtml({ token }) { try { return generateReceiptHtmlSilent({ token }) } catch { return generateReceiptHtmlSilent({ token }) } }
  
  // Handle receipt preview OK button
  const handleReceiptOK = () => {
    setShowReceiptPreview(false)
    clearCart(true)
  }

  // Handle receipt preview Print button
  const handleReceiptPrint = async () => {
    console.log('=== PRINT RECEIPT START ===')
    console.log('Receipt HTML length:', receiptHtml ? receiptHtml.length : 0)
    console.log('Receipt HTML preview:', receiptHtml ? receiptHtml.substring(0, 200) + '...' : 'EMPTY')
    
    // Debug environment
    console.log('Environment check:')
    console.log('- window.burgerPos exists:', !!window.burgerPos)
    console.log('- window.burgerPos.printWithDialog exists:', !!(window.burgerPos && window.burgerPos.printWithDialog))
    console.log('- User agent:', navigator.userAgent)
    
    // Check if receipt HTML exists
    if (!receiptHtml || receiptHtml.trim().length === 0) {
      alert('Error: Receipt content is empty. Please try generating the receipt again.')
      console.error('Receipt HTML is empty or undefined')
      return
    }
    
    try {
      // Check if print API is available
      if (!(window.burgerPos && window.burgerPos.printWithDialog)) {
        console.log('Print dialog API not available, falling back to window.print()')
        
        // Create a new window with the receipt content
        const printWindow = window.open('', '_blank', 'width=400,height=600')
        if (!printWindow) {
          alert('Pop-up blocked! Please allow pop-ups for this site and try again.')
          return
        }
        
        console.log('Writing HTML to print window...')
        printWindow.document.write(receiptHtml)
        printWindow.document.close()
        
        // Show user guidance
        alert('Print dialog will open in a new window. Please select your printer and click Print.')
        
        // Wait a moment for content to load, then show print dialog
        setTimeout(() => {
          console.log('Focusing print window and opening print dialog...')
          printWindow.focus()
          printWindow.print()
          
          // Close the window after printing (give more time)
          setTimeout(() => {
            printWindow.close()
            console.log('Print window closed')
          }, 2000)
        }, 500)
        
        return
      }

      // Use Electron's print dialog
      console.log('Using Electron print dialog...')
      console.log('Calling window.burgerPos.printWithDialog with HTML length:', receiptHtml.length)
      
      const result = await window.burgerPos.printWithDialog(receiptHtml)
      console.log('Print dialog result:', result)
      
      if (result && result.success) {
        console.log('✅ Print dialog completed successfully')
        alert('Receipt sent to printer successfully!')
      } else {
        console.log('Print dialog was cancelled or failed:', result)
        alert('Print was cancelled or failed. Please try again.')
      }
      
    } catch (error) {
      console.error('Print error:', error)
      alert(`Print error: ${error.message}`)
    } finally {
      console.log('=== PRINT RECEIPT END ===')
    }
  }

  return (
    <section className="pos-layout">
      <div>
        {tokensClosed && (
          <div className="card" style={{marginBottom:8, borderColor:'var(--danger)'}}>
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="muted">Day is <b>closed</b>. Booking and token generation are disabled.</div>
            </div>
          </div>
        )}
        <div className="row header-row">
          <h1>{title}</h1>
          <SearchBar onChange={setQuery} placeholder={`Search ${title.toLowerCase()}...`} />
        </div>
        <CategoryTabs />

        {editing && (
          <div className="card">
            <div className="card-title">Edit Item</div>
            <div className="actions">
              <button className="btn" onClick={async () => {
                const name = await dialog.prompt({ title: 'Edit Name', description: 'Update the item name.', inputLabel: 'Name', defaultValue: editing.name })
                if (name == null) return
                const priceStr = await dialog.prompt({ title: 'Edit Price', description: 'Update the item price.', inputLabel: 'Price', defaultValue: String(editing.price) })
                if (priceStr == null) return
                const price = parseFloat(String(priceStr).trim())
                const type = await dialog.prompt({ title: 'Edit Type', description: 'Update the item type (optional).', inputLabel: 'Type', defaultValue: editing.type || '' })
                if (type === null) return
                if (!String(name).trim() || isNaN(price)) return
                handleUpdate({ ...editing, name: String(name).trim(), price, type: String(type || '') })
              }}>Save</button>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="grid">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              readOnly
              variant="pos"
              showAddButton={!tokensClosed}
              onClick={() => { if (!tokensClosed) addToCart(item) }}
              onAdd={addToCart}
            />
          ))}
          {filtered.length === 0 && <div className="muted">No items yet.</div>}
        </div>
      </div>

      <aside className="card sidebar order-card">
        <div className="order-card-head">
          <div className="card-title">Current Order</div>
          <div className="muted">Token {tokenNumber || '-'} </div>
        </div>

        <div className="segmented">
          <button className={`seg-btn ${orderType==='dine-in'?'active':''}`} onClick={()=>setOrderType('dine-in')}>Dine-in</button>
          <button className={`seg-btn ${orderType==='take-away'?'active':''}`} onClick={()=>setOrderType('take-away')}>Take-Away</button>
          <button className={`seg-btn ${orderType==='delivery'?'active':''}`} onClick={()=>setOrderType('delivery')}>Delivery</button>
        </div>

        <div className="form">
          <label className="muted">Customer Name</label>
          <input className="input" placeholder="Customer Name" value={customerName} onChange={(e)=>setCustomerName(e.target.value)} />
        </div>

        {orderType==='dine-in' && (
          <div className="form">
            <label className="muted">Table</label>
            <select className="input" defaultValue="">
              <option value="">Select table</option>
              {Array.from({length:10}).map((_,i)=> <option key={i+1} value={`Table ${i+1}`}>Table {i+1}</option>)}
            </select>
          </div>
        )}

        <div className="bill-head">
          <div>Item</div>
          <div>Qty</div>
          <div>Total</div>
        </div>

        {cart.length === 0 && <div className="muted" style={{padding: '10px 0'}}>Empty</div>}
        {cart.map(row => (
          <div className="order-item" key={row.id}>
            <div className="grow">
              <div className="item-name">{row.name}</div>
            </div>
            <div className="qty-ctrl">
              <button className="icon-btn" onClick={()=>changeQty(row.id, Math.max(1, (row.qty||1)-1))}>−</button>
              <input className="input qty small" type="number" min="1" value={row.qty} onChange={(e)=>changeQty(row.id, parseInt(e.target.value||'1',10))} />
              <button className="icon-btn" onClick={()=>changeQty(row.id, (row.qty||1)+1)}>+</button>
            </div>
            <div className="price">Rs.{(row.price*row.qty).toFixed(2)}</div>
            <button className="icon-btn danger" title="Remove" onClick={()=>removeRow(row.id)}>🗑</button>
          </div>
        ))}

        <div className="row" style={{justifyContent:'space-between', marginTop:16, marginBottom:8}}>
          <div className="row" style={{gap:8, alignItems:'center'}}>
            <label>Delivery Charges</label>
            <input className="input qty small" type="number" min="0" step="1" value={deliveryCharges}
              onChange={(e)=>setDeliveryCharges(parseInt(e.target.value||'0',10)||0)} />
          </div>
          <div>Rs.{deliveryAmt}</div>
        </div>

        <div className="row" style={{justifyContent:'space-between', marginBottom:16}}>
          <div className="row" style={{gap:8, alignItems:'center'}}>
            <label>Discount %</label>
            <input className="input qty small" type="number" min="0" max="100" step="1" value={discountPct}
              onChange={(e)=>setDiscountPct(parseInt(e.target.value||'0',10)||0)} />
          </div>
          <div>Rs.{discountAmount.toFixed(0)}</div>
        </div>

        <div className="order-totals">
          <div className="row"><div>Subtotal</div><div className="price">Rs.{total.toFixed(0)}</div></div>
          {deliveryAmt > 0 && (
            <div className="row"><div>Delivery Charges</div><div className="price">Rs.{deliveryAmt.toFixed(0)}</div></div>
          )}
          {discountAmount > 0 && (
            <div className="row"><div>Discount ({discountPct}%)</div><div className="price">-Rs.{discountAmount.toFixed(0)}</div></div>
          )}
          <div className="row" style={{fontWeight: 'bold'}}><div>Grand Total</div><div className="price">Rs.{grandTotal.toFixed(0)}</div></div>
        </div>

        <div className="row" style={{marginTop: '10px'}}>
          <div>Paid</div>
          <input 
            className="input" 
            style={{width: '100%', marginLeft: '10px'}} 
            type="number"
            value={paidAmount || ''}
            onChange={(e) => setPaidAmount(e.target.value ? parseFloat(e.target.value) : 0)}
          />
        </div>

        <div className="row" style={{marginTop: '20px', marginBottom: '10px'}}>
          <div className="quick-pay-buttons">
            <button className="btn" style={{backgroundColor: '#ff0000', color: 'white', margin: '0 5px'}} onClick={() => setPaidAmount((prev) => (prev || 0) + 10)}>Rs.10</button>
            <button className="btn" style={{backgroundColor: '#ff0000', color: 'white', margin: '0 5px'}} onClick={() => setPaidAmount((prev) => (prev || 0) + 100)}>Rs.100</button>
            <button className="btn" style={{backgroundColor: '#ff0000', color: 'white', margin: '0 5px'}} onClick={() => setPaidAmount((prev) => (prev || 0) + 500)}>Rs.500</button>
            <button className="btn" style={{backgroundColor: '#ff0000', color: 'white', margin: '0 5px'}} onClick={() => setPaidAmount((prev) => (prev || 0) + 1000)}>Rs.1000</button>
          </div>
        </div>

        <div className="row" style={{justifyContent: 'space-between', marginTop: '10px'}}>
          <div>Change</div>
          <div>Rs. {Math.max(0, (paidAmount || 0) - grandTotal).toFixed(0)}</div>
        </div>

        <div className="order-actions" style={{marginTop: '20px'}}>
          <button className="btn" style={{width: '100%', backgroundColor: '#ff0000', color: 'white'}} onClick={handleOkDone} disabled={cart.length===0}>Print Invoice</button>
        </div>
      </aside>

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }} onClick={handleReceiptOK}>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            width: '100%',
            maxWidth: '450px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            position: 'relative',
            margin: '0 auto'
          }} onClick={(e)=>e.stopPropagation()}>
            
            <div style={{
              textAlign: 'center',
              marginBottom: '20px',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#333',
              borderBottom: '2px solid #f0f0f0',
              paddingBottom: '10px'
            }}>
              Receipt Preview
            </div>
            
            <div style={{
              border: '1px solid #e0e0e0',
              padding: '15px',
              marginBottom: '20px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              overflowX: 'hidden',
              textAlign: 'center'
            }}>
              <div dangerouslySetInnerHTML={{__html: receiptHtml}} />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button 
                onClick={handleReceiptOK}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  minWidth: '80px'
                }}
              >
                OK
              </button>
              <button 
                onClick={handleReceiptPrint}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  minWidth: '80px'
                }}
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
