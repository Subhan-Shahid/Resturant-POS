import { useEffect, useMemo, useState } from 'react'
import SearchBar from '../components/SearchBar.jsx'
import ItemForm from '../components/ItemForm.jsx'
import ItemCard from '../components/ItemCard.jsx'
import { addItem, deleteItem, listItems, searchItems, updateItem } from '../utils/storage.js'

export default function CrudPage({ storageKey, title, typeOptions, showForm = false, includeImage = false, onAddType }) {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setItems(listItems(storageKey))
  }, [storageKey])

  const filtered = useMemo(() => (query ? searchItems(storageKey, query) : items), [items, query, storageKey])

  const handleAdd = (data) => {
    const created = addItem(storageKey, data)
    setItems(prev => [...prev, created])
  }

  const handleUpdate = (data) => {
    updateItem(storageKey, data)
    setItems(prev => prev.map(i => i.id === data.id ? { ...i, ...data } : i))
    setEditing(null)
  }

  const handleDelete = (id) => {
    deleteItem(storageKey, id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <section>
      <div className="row header-row">
        <h1>{title}</h1>
        <SearchBar onChange={setQuery} placeholder={`Search ${title.toLowerCase()}...`} />
      </div>

      {(showForm || editing) && (
        <ItemForm
          initial={editing}
          onSubmit={editing ? handleUpdate : handleAdd}
          onCancel={() => setEditing(null)}
          typeOptions={typeOptions}
          includeImage={includeImage}
          onAddType={onAddType}
        />
      )}

      <div className="grid">
        {filtered.map((item) => (
          <ItemCard key={item.id} item={item} onEdit={setEditing} onDelete={handleDelete} />
        ))}
        {filtered.length === 0 && <div className="muted">No items yet.</div>}
      </div>
    </section>
  )
}
