import { useEffect, useState } from 'react'
import { Button, Dialog } from './ui'
import styles from './Projects.module.css'

function CategoryRow({ category, onRename, onDelete }) {
  const [name, setName] = useState(category.name)
  useEffect(() => { setName(category.name) }, [category.name])
  return (
    <form className={styles.categoryRow} onSubmit={event => { event.preventDefault(); if (name.trim()) onRename(category.id, name.trim()) }}>
      <input aria-label={`Rename ${category.name}`} value={name} onChange={event => setName(event.target.value)} required />
      <Button type="submit" aria-label={`Save category ${category.name}`} disabled={!name.trim()}>Save</Button>
      <Button variant="danger" aria-label={`Delete category ${category.name}`} onClick={() => onDelete(category.id)}>Delete</Button>
    </form>
  )
}

export default function ProjectCategories({ categories, onCreate, onRename, onDelete, onClose }) {
  const [name, setName] = useState('')
  return (
    <Dialog open title="Project categories" onClose={onClose}>
      <div className={styles.form}>
        {categories.map(category => <CategoryRow key={category.id} category={category} onRename={onRename} onDelete={onDelete} />)}
        {!categories.length && <p className={styles.hint}>No categories yet. Add one for any kind of project.</p>}
        <form className={styles.categoryRow} onSubmit={event => { event.preventDefault(); if (name.trim()) { onCreate(name.trim()); setName('') } }}>
          <input aria-label="Category name" placeholder="New category name" value={name} onChange={event => setName(event.target.value)} required />
          <Button type="submit" variant="primary" disabled={!name.trim()}>Add category</Button>
        </form>
      </div>
    </Dialog>
  )
}
