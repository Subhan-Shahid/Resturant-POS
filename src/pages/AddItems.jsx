import { useEffect, useMemo, useState } from 'react'
import ItemForm from '../components/ItemForm.jsx'
import { Plus } from 'lucide-react'
import ItemCard from '../components/ItemCard.jsx'
import { StorageKeys, addItem, listItems, updateItem, deleteItem, listTypesForCategory, addTypeForCategory } from '../utils/storage.js'

const CATEGORY_CONFIG = {
  foods: { title: 'Food', types: ['Burger','Wings','Fries','Wrap','Chicken','Strips','Cheese Balls','Nuggets'], includeImage: true },
  deals: { title: 'Deals', types: ['Deal','Deal#1','Deal#2','Deal#3','Deal#4','Family Bag Share','Super Family Bag Share'], includeImage: true },
  drinks: { title: 'Drinks', types: ['Soda','Juice','Coffee','Tea','Water'], includeImage: true },
  extras: { title: 'Extras', types: ['Sauce','Topping','Side'], includeImage: true },
}

export default function AddItems() {
  const [category, setCategory] = useState('foods')
  const cfg = useMemo(() => CATEGORY_CONFIG[category], [category])
  const [lastAdded, setLastAdded] = useState(null)
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null) // item being edited or null
  const [showForm, setShowForm] = useState(false) // controls visibility of add/edit form
  const [extraTypes, setExtraTypes] = useState([])

  // Load items and custom types whenever category changes
  useEffect(() => {
    setItems(listItems(StorageKeys[category]))
    setEditing(null)
    setShowForm(false)
    setExtraTypes(listTypesForCategory(category))
  }, [category])

  const mergedTypes = useMemo(() => {
    const set = new Set([...(cfg.types||[]), ...(extraTypes||[])])
    return Array.from(set)
  }, [cfg.types, extraTypes])

  const handleAddType = (t) => {
    const arr = addTypeForCategory(category, t)
    setExtraTypes(arr)
  }

  const handleAdd = (data) => {
    const created = addItem(StorageKeys[category], data)
    setLastAdded({ ...created, category })
    setItems(prev => [...prev, created])
    setShowForm(false)
  }

  const handleUpdate = (data) => {
    updateItem(StorageKeys[category], data)
    setItems(prev => prev.map(i => i.id === data.id ? { ...i, ...data } : i))
    setEditing(null)
    setShowForm(false)
  }

  const handleDelete = (id) => {
    deleteItem(StorageKeys[category], id)
    setItems(prev => prev.filter(i => i.id !== id))
    if (editing && editing.id === id) setEditing(null)
  }

  return (
    <section className="page">
      <div className="card menu-header-card" style={{marginBottom:12}}>
        <div>
          <h1 className="page-title">Menu Management</h1>
          <p className="menu-subtitle muted">Manage your restaurant menu items and categories.</p>
        </div>
        {!showForm && (
          <button
            className="btn primary"
            onClick={()=>{ setEditing(null); setShowForm(true) }}
            style={{
              borderRadius: 9999,
              height: 44,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              paddingInline: 16,
              boxShadow: '0 6px 16px rgba(255,0,0,0.25)'
            }}
          >
            <Plus size={18} />
            Add New Item
          </button>
        )}
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="row" style={{flexWrap:'wrap', gap:8}}>
          {Object.entries(CATEGORY_CONFIG).map(([key, val]) => (
            <button key={key} className={`btn ${category===key?'primary':''}`} onClick={()=>setCategory(key)}>
              {val.title}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        !editing ? (
          <ItemForm
            onSubmit={handleAdd}
            onCancel={()=>setShowForm(false)}
            typeOptions={mergedTypes}
            includeImage={cfg.includeImage}
            onAddType={handleAddType}
          />
        ) : (
          <ItemForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => { setEditing(null); setShowForm(false) }}
            typeOptions={mergedTypes}
            includeImage={cfg.includeImage}
            onAddType={handleAddType}
          />
        )
      )}

      {lastAdded && (
        <div className="card">
          <div className="card-title">Added successfully</div>
          <div className="muted">
            {cfg.title} item "{lastAdded.name}" added.
          </div>
        </div>
      )}

      <div className="card" style={{marginTop:12}}>
        <div className="card-title">{cfg.title} Items</div>
        <div className="grid">
          {items.length === 0 && <div className="muted">No items yet.</div>}
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={(it)=>{ setEditing(it); setShowForm(true) }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
