// Recipes storage utilities

const RECIPES_KEY = 'recipes'

function safeRead(key, fallback){
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// Shape: { [itemId: string]: Array<{ name: string, unit?: string, qty: number }> }
export function listAllRecipes(){
  return safeRead(RECIPES_KEY, {})
}

export function getRecipe(itemId){
  const all = listAllRecipes()
  return all[itemId] || []
}

export function setRecipe(itemId, ingredients){
  const all = listAllRecipes()
  all[itemId] = (ingredients||[]).map((ing)=>({
    name: (ing.name||'').trim(),
    unit: (ing.unit||'').trim(),
    qty: Number.isFinite(ing.qty) ? ing.qty : parseFloat(ing.qty||0) || 0,
  }))
  safeWrite(RECIPES_KEY, all)
  return all[itemId]
}

export function deleteRecipe(itemId){
  const all = listAllRecipes()
  if (all[itemId]) {
    delete all[itemId]
    safeWrite(RECIPES_KEY, all)
  }
}

// Replace all recipes at once (expects an object mapping itemId -> array of ingredients)
export function setAllRecipes(obj){
  const normalized = {}
  if (obj && typeof obj === 'object') {
    for (const [itemId, arr] of Object.entries(obj)) {
      if (!Array.isArray(arr)) continue
      normalized[itemId] = arr.map((ing)=>({
        name: (ing?.name||'').trim(),
        unit: (ing?.unit||'').trim(),
        qty: Number.isFinite(ing?.qty) ? ing.qty : parseFloat(ing?.qty||0) || 0,
      })).filter(r => r.name)
    }
  }
  safeWrite(RECIPES_KEY, normalized)
  return normalized
}

// Export recipes as a JSON string
export function exportRecipes(){
  return JSON.stringify(listAllRecipes(), null, 2)
}

// Import recipes from a JSON string; returns boolean success
export function importRecipes(json){
  try {
    const obj = JSON.parse(json)
    if (!obj || typeof obj !== 'object') return false
    setAllRecipes(obj)
    return true
  } catch {
    return false
  }
}
