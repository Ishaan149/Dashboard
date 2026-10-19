import { useEffect, useState } from 'react'
import { Button, Dialog } from './ui'
import { isHexColor } from '../theme/theme'
import styles from './Projects.module.css'

function CategoryRow({ category, defaultColor, onUpdate, onDelete }) {
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(isHexColor(category.color) ? category.color : null)
  useEffect(() => { setName(category.name) }, [category.name])
  useEffect(() => { setColor(isHexColor(category.color) ? category.color : null) }, [category.color])
  return (
    <form className={styles.categoryRow} onSubmit={event => { event.preventDefault(); if (name.trim()) onUpdate(category.id, { name: name.trim(), ...(color ? { color: color.toUpperCase() } : {}) }) }}>
      <input className={styles.colorPicker} type="color" aria-label={`Color for ${category.name}`} title={`Color for ${category.name}`} value={color ?? defaultColor} onInput={event => setColor(event.currentTarget.value)} />
      <input aria-label={`Rename ${category.name}`} value={name} onChange={event => setName(event.target.value)} required />
      <Button type="submit" aria-label={`Save category ${category.name}`} disabled={!name.trim()}>Save</Button>
      <Button variant="danger" aria-label={`Delete category ${category.name}`} onClick={() => onDelete(category.id)}>Delete</Button>
    </form>
  )
}

export default function ProjectCategories({ categories, defaultColor, onCreate, onUpdate, onDelete, onClose }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(defaultColor)
  return (
    <Dialog open title="Project categories" onClose={onClose}>
      <div className={styles.form}>
        {categories.map(category => <CategoryRow key={category.id} category={category} defaultColor={defaultColor} onUpdate={onUpdate} onDelete={onDelete} />)}
        {!categories.length && <p className={styles.hint}>No categories yet. Add one for any kind of project.</p>}
        <form className={styles.categoryRow} onSubmit={event => { event.preventDefault(); if (name.trim()) { onCreate(name.trim(), color); setName(''); setColor(defaultColor) } }}>
          <input className={styles.colorPicker} type="color" aria-label="New category color" title="New category color" value={color} onInput={event => setColor(event.currentTarget.value)} />
          <input aria-label="Category name" placeholder="New category name" value={name} onChange={event => setName(event.target.value)} required />
          <Button type="submit" variant="primary" disabled={!name.trim()}>Add category</Button>
        </form>
      </div>
    </Dialog>
  )
}
