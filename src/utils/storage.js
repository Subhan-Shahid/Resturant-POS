const KEYS = {
  foods: 'foods',
  deals: 'deals',
  drinks: 'drinks',
  extras: 'extras',
  bill: 'billItems',
  tokenCounter: 'tokenCounter',
  tokenDate: 'tokenDate',
  tokenClosed: 'tokenClosed',
  businessHours: 'businessHours',
  dayClosures: 'dayClosures',
  dayOpenAt: 'dayOpenAt',
  dayOpenBizDate: 'dayOpenBizDate',
  dayCloseAt: 'dayCloseAt',
  restaurantInfo: 'restaurantInfo',
  sales: 'salesRecords',
  returns: 'returnRecords',
  users: 'users',
  session: 'currentUserId',
  lastToken: 'lastTokenNumber',
  yesterdaySummary: 'yesterdaySummary',
  printerConfig: 'printerConfig',
}

// Day open status
export function getDayOpenAt(){ try { return parseInt(localStorage.getItem(KEYS.dayOpenAt)||'0',10) || 0 } catch { return 0 } }
export function setDayOpenAt(ts){ try { localStorage.setItem(KEYS.dayOpenAt, String(ts)) } catch {} }
export function clearDayOpenAt(){ try { localStorage.removeItem(KEYS.dayOpenAt) } catch {} }
export function getDayOpenBizDate(){ try { return localStorage.getItem(KEYS.dayOpenBizDate) || '' } catch { return '' } }
export function setDayOpenBizDate(bizId){ try { localStorage.setItem(KEYS.dayOpenBizDate, String(bizId||'')) } catch {} }
export function clearDayOpenBizDate(){ try { localStorage.removeItem(KEYS.dayOpenBizDate) } catch {} }

export function getDayCloseAt(){ try { return parseInt(localStorage.getItem(KEYS.dayCloseAt)||'0',10) || 0 } catch { return 0 } }
export function setDayCloseAt(ts){ try { localStorage.setItem(KEYS.dayCloseAt, String(ts)) } catch {} }
export function clearDayCloseAt(){ try { localStorage.removeItem(KEYS.dayCloseAt) } catch {} }

export function openDay(){
  // Start a new business day session using the CURRENT system date/time
  try {
    const now = Date.now()
    // Use CALENDAR date (local) for Business Date on Day Open
    const dt = new Date(now)
    const bizId = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
    // Set active token date to today's business date
    localStorage.setItem(KEYS.tokenDate, String(bizId||''))
    // Reset token counter so next token is 1
    localStorage.setItem(KEYS.tokenCounter, '0')
    localStorage.setItem(KEYS.lastToken, '0')
    // Record business date used to open the day
    setDayOpenBizDate(bizId)
    // Record exact open timestamp
    setDayOpenAt(now)
    // Clear any previous close timestamp
    clearDayCloseAt()
  } catch {}
  openTokens()
  try { window.dispatchEvent(new Event('day:status-changed')) } catch {}
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Failed to read from localStorage', key, e)
    return []
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Failed to write to localStorage', key, e)
  }
}

function uid() {return Math.random().toString(36).slice(2,10)}

export function listItems(key) { return read(key) }

export function addItem(key, item) {
  const items = read(key)
  const newItem = { id: uid(), ...item }
  items.push(newItem)
  write(key, items)
  return newItem
}

export function updateItem(key, item) {
  const items = read(key)
  const idx = items.findIndex(i => i.id === item.id)
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...item }
    write(key, items)
  }
}

export function deleteItem(key, id) {
  const items = read(key)
  write(key, items.filter(i => i.id !== id))
}

export function searchItems(key, query) {
  const q = (query || '').toLowerCase()
  return listItems(key).filter(i => i.name.toLowerCase().includes(q) || (i.type||'').toLowerCase().includes(q))
}

export function getAllCatalog() {
  return {
    foods: listItems(KEYS.foods),
    deals: listItems(KEYS.deals),
    drinks: listItems(KEYS.drinks),
    extras: listItems(KEYS.extras),
  }
}

export function listBill() { return read(KEYS.bill) }
export function setBill(items) { write(KEYS.bill, items) }

export const StorageKeys = KEYS

// ------- Custom Types per Category -------
function typeKey(category){
  // Store custom types under a namespaced key, e.g. "types:foods"
  return `types:${category}`
}

export function listTypesForCategory(category){
  try {
    const raw = localStorage.getItem(typeKey(category))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(Boolean) : []
  } catch {
    return []
  }
}

export function addTypeForCategory(category, newType){
  const t = String(newType || '').trim()
  if (!t) return listTypesForCategory(category)
  const arr = listTypesForCategory(category)
  if (!arr.includes(t)) {
    arr.push(t)
    try { localStorage.setItem(typeKey(category), JSON.stringify(arr)) } catch {}
  }
  return arr
}

// Token helpers
export function resetTokenCounter(startAt = 0) {
  try { localStorage.setItem(KEYS.tokenCounter, String(startAt)) } catch {}
}

export function isTokenClosed(){
  try { return localStorage.getItem(KEYS.tokenClosed) === '1' } catch { return false }
}
export function closeTokens(){
  try { localStorage.setItem(KEYS.tokenClosed, '1') } catch {}
  try { window.dispatchEvent(new Event('day:status-changed')) } catch {}
}
export function openTokens(){
  try { localStorage.removeItem(KEYS.tokenClosed) } catch {}
}

function todayKey(){
  const d = new Date(); d.setHours(0,0,0,0); return String(d.getTime())
}
export function ensureTokenDay(){
  try {
    // Do not auto-roll or regress the business date based on system time.
    // Only initialize if missing; changes are controlled explicitly by Day Close.
    const stored = localStorage.getItem(KEYS.tokenDate)
    if (!stored) {
      const currentBiz = getBusinessDateId(Date.now())
      localStorage.setItem(KEYS.tokenDate, currentBiz)
      localStorage.setItem(KEYS.tokenCounter, '0')
      localStorage.setItem(KEYS.lastToken, '0')
    }
  } catch {}
}

export function nextToken() {
  try {
    // Stop generation if tokens are closed
    if (isTokenClosed()) return ''
    // Reset counter if day changed
    ensureTokenDay()
    // Current stored counter
    const raw = localStorage.getItem(KEYS.tokenCounter)
    let n = parseInt(raw || '0', 10)
    if (isNaN(n) || n < 0) n = 0

    // Last issued token we persisted (only consider if it's for the current business date)
    let last = 0
    try {
      const lastDate = localStorage.getItem(KEYS.tokenDate) || ''
      const currentBiz = getActiveBusinessDateId()
      if (lastDate === currentBiz) {
        last = parseInt(localStorage.getItem(KEYS.lastToken) || '0', 10) || 0
      }
    } catch {}

    // Highest token recorded in current business date's sales (as an extra safety net)
    let todayMax = 0
    try {
      const currentBiz = getActiveBusinessDateId()
      const sales = listSales()
      for (const s of sales) {
        // Match by business date ID instead of timestamp to handle day close/open correctly
        const saleBizId = s?.bizId || getBusinessDateId(s.createdAt || 0)
        if (saleBizId === currentBiz) {
          const t = parseInt(String(s.token || '0'), 10)
          if (!isNaN(t)) todayMax = Math.max(todayMax, t)
        }
      }
    } catch {}

    const base = Math.max(n, last, todayMax)
    const next = base + 1
    localStorage.setItem(KEYS.tokenCounter, String(next))
    try { localStorage.setItem(KEYS.lastToken, String(next)) } catch {}
    return String(next)
  } catch {
    return String(Math.floor(1 + Math.random()*999))
  }
}

// Persist the last issued token number so it remains after refresh
export function getLastToken(){
  try { return localStorage.getItem(KEYS.lastToken) || '' } catch { return '' }
}
export function setLastToken(t){
  try { localStorage.setItem(KEYS.lastToken, String(t||'')) } catch {}
}

// Yesterday summary helpers (snapshot written on Day Close)
export function getYesterdaySummary(){
  try {
    const raw = localStorage.getItem(KEYS.yesterdaySummary)
    return raw ? JSON.parse(raw) : { bizId: '', subtotal: 0, deliveryCharges: 0, gross: 0, discount: 0, net: 0, returned: 0, salesCount: 0, returnsCount: 0, tokensGenerated: 0 }
  } catch {
    return { bizId: '', subtotal: 0, deliveryCharges: 0, gross: 0, discount: 0, net: 0, returned: 0, salesCount: 0, returnsCount: 0, tokensGenerated: 0 }
  }
}
export function setYesterdaySummary(summary){
  write(KEYS.yesterdaySummary, summary || { bizId: '', subtotal: 0, deliveryCharges: 0, gross: 0, discount: 0, net: 0, returned: 0, salesCount: 0, returnsCount: 0, tokensGenerated: 0 })
}

// Restaurant info helpers
const DEFAULT_RESTAURANT = {
  name: 'Your Restaurant',
  address: '123 Main Street, City',
  phone: '+00 000 0000000',
  logo: '', // data URL
}

export function getRestaurantInfo() {
  try {
    const raw = localStorage.getItem(KEYS.restaurantInfo)
    return raw ? JSON.parse(raw) : DEFAULT_RESTAURANT
  } catch {
    return DEFAULT_RESTAURANT
  }
}
export function setRestaurantInfo(info) { write(KEYS.restaurantInfo, info) }

// Sales helpers
export function listSales() { return read(KEYS.sales) }
export function addSale(sale) {
  const sales = read(KEYS.sales)
  const currentUser = getCurrentUser()
  const rec = { 
    id: uid(), 
    bizId: (function(){ try { return getActiveBusinessDateId() } catch { return getBusinessDateId(Date.now()) } })(), 
    cashier: currentUser ? currentUser.username : 'Unknown',
    cashierId: currentUser ? currentUser.id : null,
    ...sale 
  }
  sales.push(rec)
  write(KEYS.sales, sales)
  try { window.dispatchEvent(new Event('data:sales-changed')) } catch {}
  return rec
}
export function deleteSale(id) {
  const sales = read(KEYS.sales)
  write(KEYS.sales, sales.filter(s => s.id !== id))
  try { window.dispatchEvent(new Event('data:sales-changed')) } catch {}
}

// Returns helpers
export function listReturns() { return read(KEYS.returns) }
export function addReturn(ret) {
  const returns = read(KEYS.returns)
  const rec = { id: uid(), createdAt: Date.now(), bizId: (function(){ try { return getActiveBusinessDateId() } catch { return getBusinessDateId(Date.now()) } })(), ...ret }
  returns.push(rec)
  write(KEYS.returns, returns)
  try { window.dispatchEvent(new Event('data:returns-changed')) } catch {}
  return rec
}
export function deleteReturn(id) {
  const returns = read(KEYS.returns)
  write(KEYS.returns, returns.filter(r => r.id !== id))
  try { window.dispatchEvent(new Event('data:returns-changed')) } catch {}
}

// Users helpers
export function listUsers() { return read(KEYS.users) }
export function addUser(user) {
  const users = read(KEYS.users)
  const rec = { id: uid(), ...user }
  users.push(rec)
  write(KEYS.users, users)
  return rec
}
export function updateUser(user) {
  const users = read(KEYS.users)
  const idx = users.findIndex(u => u.id === user.id)
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...user }
    write(KEYS.users, users)
  }
}
export function deleteUser(id) {
  const users = read(KEYS.users)
  write(KEYS.users, users.filter(u => u.id !== id))
}
export function exportUsers() {
  return JSON.stringify(listUsers(), null, 2)
}
export function importUsers(json) {
  try {
    const arr = JSON.parse(json)
    if (Array.isArray(arr)) write(KEYS.users, arr)
  } catch (e) { console.error('Invalid users import', e) }
}

// Export/Import ALL app data stored under our KEYS namespace
export function exportAllData(){
  try {
    const payload = { _meta: { exportedAt: Date.now(), version: 1 } }
    for (const [name, k] of Object.entries(KEYS)) {
      try {
        const raw = localStorage.getItem(k)
        if (raw != null) payload[name] = JSON.parse(raw)
      } catch {
        // skip on parse error
      }
    }
    return JSON.stringify(payload, null, 2)
  } catch (e) {
    console.error('Failed to export all data', e)
    return '{}'
  }
}

export function importAllData(json){
  try {
    const obj = JSON.parse(json)
    if (!obj || typeof obj !== 'object') throw new Error('Invalid data')
    // Only accept keys that exist in KEYS mapping
    for (const [name, k] of Object.entries(KEYS)) {
      if (Object.prototype.hasOwnProperty.call(obj, name)) {
        try {
          localStorage.setItem(k, JSON.stringify(obj[name]))
        } catch (e) {
          console.error('Failed to import key', name, e)
        }
      }
    }
    return true
  } catch (e) {
    console.error('Invalid all-data import', e)
    return false
  }
}

// Danger: remove all app data keys
export function wipeAllData() {
  try {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
  } catch (e) {
    console.error('Failed to wipe data', e)
  }
}

// Auth helpers
export function getCurrentUser() {
  try {
    const id = localStorage.getItem(KEYS.session)
    if (!id) return null
    return listUsers().find(u => String(u.id) === String(id)) || null
  } catch {
    return null
  }
}

export function login(username, password) {
  const users = listUsers()
  const user = users.find(u => (u.username||'') === username && (u.password||'') === password)
  if (user) {
    try { localStorage.setItem(KEYS.session, String(user.id)) } catch {}
    return user
  }
  return null
}

export function logout() { try { localStorage.removeItem(KEYS.session) } catch {} }

// Business hours helpers
const DEFAULT_BIZ_HOURS = { open: '06:00', close: '03:00' } // close means next-day if earlier than open
export function getBusinessHours(){
  try { const raw = localStorage.getItem(KEYS.businessHours); return raw ? JSON.parse(raw) : DEFAULT_BIZ_HOURS } catch { return DEFAULT_BIZ_HOURS }
}
export function setBusinessHours(hours){ write(KEYS.businessHours, hours) }

// Given a timestamp, return the start and end of the business day containing it
export function getBusinessWindow(ts){
  const { open, close } = getBusinessHours()
  const [oh, om] = (open||'00:00').split(':').map(n=>parseInt(n||'0',10))
  const [ch, cm] = (close||'23:59').split(':').map(n=>parseInt(n||'0',10))
  const d = new Date(ts || Date.now())
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const openTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), oh, om).getTime()
  let closeTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), ch, cm).getTime()
  // If close is earlier or equal to open, treat as next day close (overnight)
  if (closeTime <= openTime) closeTime += 24*60*60*1000
  // If current ts is before openTime, shift window to previous day
  if ((ts||Date.now()) < openTime) {
    const prev = openTime - 24*60*60*1000
    return { start: prev, end: prev + (closeTime - openTime) }
  }
  return { start: openTime, end: closeTime }
}

export function getBusinessDateId(ts){
  const { start } = getBusinessWindow(ts)
  const d = new Date(start)
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

// Safely increment a business date id (yyyy-mm-dd) in local time to avoid timezone/DST issues
export function incrementBusinessDateId(ymd, days = 1){
  try {
    const [y, m, d] = String(ymd||'').split('-').map(n=>parseInt(n,10))
    if (!y || !m || !d) return getBusinessDateId(Date.now())
    // Use local noon to avoid DST edges
    const dt = new Date(y, m-1, d, 12, 0, 0, 0)
    dt.setDate(dt.getDate() + (parseInt(days,10)||1))
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth()+1).padStart(2,'0')
    const dd = String(dt.getDate()).padStart(2,'0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return getBusinessDateId(Date.now())
  }
}

// Active business date id that does NOT change at midnight.
// It remains the same from the moment the Day is opened until Day Close.
export function getActiveBusinessDateId(){
  try {
    // Prefer explicitly stored token date if present
    const stored = localStorage.getItem(KEYS.tokenDate)
    if (stored) return stored
  } catch {}
  try {
    const openedAt = getDayOpenAt()
    if (openedAt && !isTokenClosed()) return getBusinessDateId(openedAt)
  } catch {}
  return getBusinessDateId(Date.now())
}

// Day closure records
export function listDayClosures(){ return read(KEYS.dayClosures) }
export function addDayClosure(summary){
  const arr = read(KEYS.dayClosures)
  arr.push({ id: uid(), ...summary })
  write(KEYS.dayClosures, arr)
  return summary
}

// Manually set the active business date (token date) and notify listeners
export function setActiveBusinessDateId(bizId){
  try {
    const requested = String(bizId||'')
    const current = localStorage.getItem(KEYS.tokenDate) || ''
    let next = requested
    if (current) {
      // If requested is empty or not strictly ahead, advance by one day from current
      if (!requested || requested <= current) {
        next = incrementBusinessDateId(current, 1)
      }
    }
    localStorage.setItem(KEYS.tokenDate, String(next||requested||''))
  } catch {}
  try { window.dispatchEvent(new Event('day:status-changed')) } catch {}
}

// Force set the business date to a specific date (used for custom date selection)
export function forceSetBusinessDateId(bizId){
  try {
    const requested = String(bizId||'')
    if (requested) {
      localStorage.setItem(KEYS.tokenDate, requested)
    }
  } catch {}
  try { window.dispatchEvent(new Event('day:status-changed')) } catch {}
}

// Printer configuration helpers
export function getPrinterConfig(){
  try {
    const raw = localStorage.getItem(KEYS.printerConfig)
    return raw ? JSON.parse(raw) : { printerName: '', enabled: false }
  } catch {
    return { printerName: '', enabled: false }
  }
}

export function setPrinterConfig(config){
  write(KEYS.printerConfig, config)
  try { window.dispatchEvent(new Event('printer:config-changed')) } catch {}
}
