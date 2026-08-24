import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FOOD_NAME_LIMIT,
  buildVisibleWeightSeries,
  createWellnessId,
  getCurrentWeight,
  getDailyNutritionTotals,
  getFoodRecordsForDate,
  getVisiblePeriodChange,
  getWeightChartBounds,
  getWeightChartCoordinates,
  hasExactSavedFoodDuplicate,
  normalizeFoodRecords,
  normalizeSavedFoods,
  normalizeWeightRecords,
  removeWeightRecord,
  upsertWeightRecord,
  validateFoodInput,
  validateWeightKg,
} from '../domain/wellness'
import { addDays, isLocalDateKey, parseLocalDateKey, toLocalDateKey } from '../utils/date'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { Button, Dialog, EmptyState, useToast } from './ui'
import styles from './Wellness.module.css'

function todayKey() {
  return toLocalDateKey(new Date())
}

function formatDate(dateKey, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
  const date = parseLocalDateKey(dateKey)
  return date ? new Intl.DateTimeFormat(undefined, options).format(date) : dateKey
}

function formatWeight(weightKg) {
  return `${Number(weightKg).toFixed(1)} kg`
}

function formatWeightChange(change) {
  if (change === null) return '—'
  return `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`
}

function DateNavigator({ selectedDate, onSelectDate }) {
  const today = todayKey()
  const selected = parseLocalDateKey(selectedDate) ?? new Date()
  const previousDate = toLocalDateKey(addDays(selected, -1))
  const nextDate = toLocalDateKey(addDays(selected, 1))
  const isToday = selectedDate === today

  return (
    <div className={styles.dateNavigator} role="group" aria-label="Nutrition date navigation">
      <Button
        className={styles.dateMove}
        onClick={() => onSelectDate(previousDate)}
        aria-label={`Previous nutrition date from ${formatDate(selectedDate)}`}
      >
        <span aria-hidden="true">‹</span>
      </Button>
      <time className={styles.dateNavText} dateTime={selectedDate} aria-label="Selected nutrition date">
        {isToday ? 'Today' : formatDate(selectedDate, { weekday: 'short', month: 'short', day: 'numeric' })}
      </time>
      <Button
        className={styles.dateMove}
        onClick={() => onSelectDate(nextDate)}
        disabled={isToday}
        aria-label={`Next nutrition date from ${formatDate(selectedDate)}`}
      >
        <span aria-hidden="true">›</span>
      </Button>
    </div>
  )
}

function FieldError({ id, message }) {
  return message ? <p id={id} className={styles.error} role="alert">{message}</p> : null
}

function ManualFoodForm({ onAdd }) {
  const [form, setForm] = useState({ name: '', calories: '', proteinGrams: '', saveAsReusable: false })
  const [errors, setErrors] = useState({})

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  function submit(event) {
    event.preventDefault()
    const validation = validateFoodInput(form)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    onAdd(validation.value, form.saveAsReusable)
    setForm({ name: '', calories: '', proteinGrams: '', saveAsReusable: false })
    setErrors({})
  }

  return (
    <form className={styles.entryForm} onSubmit={submit} noValidate>
      <div className={styles.formHeading}>
        <h3>Enter food</h3>
      </div>
      <div className={styles.foodFormGrid}>
        <div className={styles.field}>
          <label htmlFor="wellness-food-name">Food name</label>
          <input
            id="wellness-food-name"
            value={form.name}
            maxLength={FOOD_NAME_LIMIT}
            onChange={event => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'wellness-food-name-error' : undefined}
            autoComplete="off"
          />
          <FieldError id="wellness-food-name-error" message={errors.name} />
        </div>
        <div className={styles.field}>
          <label htmlFor="wellness-food-calories">Calories</label>
          <input
            id="wellness-food-calories"
            type="number"
            inputMode="numeric"
            min="0"
            max="20000"
            step="1"
            value={form.calories}
            onChange={event => updateField('calories', event.target.value)}
            aria-invalid={Boolean(errors.calories)}
            aria-describedby={errors.calories ? 'wellness-food-calories-error' : undefined}
          />
          <FieldError id="wellness-food-calories-error" message={errors.calories} />
        </div>
        <div className={styles.field}>
          <label htmlFor="wellness-food-protein">Protein (g)</label>
          <input
            id="wellness-food-protein"
            type="number"
            inputMode="numeric"
            min="0"
            max="1000"
            step="1"
            value={form.proteinGrams}
            onChange={event => updateField('proteinGrams', event.target.value)}
            aria-invalid={Boolean(errors.proteinGrams)}
            aria-describedby={errors.proteinGrams ? 'wellness-food-protein-error' : undefined}
          />
          <FieldError id="wellness-food-protein-error" message={errors.proteinGrams} />
        </div>
        <div className={styles.manualAction}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={form.saveAsReusable}
              onChange={event => updateField('saveAsReusable', event.target.checked)}
            />
            <span>Save as reusable food</span>
          </label>
          <Button type="submit" variant="primary">Add food</Button>
        </div>
      </div>
    </form>
  )
}

function SavedFoodControl({ savedFoods, selectedSavedFoodId, onSelect, onAdd, onRequestDelete }) {
  const selected = savedFoods.find(food => food.id === selectedSavedFoodId) ?? null

  return (
    <section className={styles.savedFoodSection} aria-labelledby="saved-foods-heading">
      <div className={styles.formHeading}>
        <h3 id="saved-foods-heading">Saved foods</h3>
      </div>
      {savedFoods.length > 0 && (
        <div className={styles.savedControlGrid}>
          <div className={styles.field}>
            <label htmlFor="wellness-saved-food">Choose saved food</label>
            <select
              id="wellness-saved-food"
              value={selected?.id ?? ''}
              onChange={event => onSelect(event.target.value)}
            >
              <option value="">Choose a saved food</option>
              {savedFoods.map(food => (
                <option key={food.id} value={food.id}>
                  {food.name} — {food.calories} calories, {food.proteinGrams} g protein
                </option>
              ))}
            </select>
          </div>
          <div className={styles.savedPreview} aria-live="polite" aria-label="Saved food nutrition preview">
            {selected ? <>
              <span><b>{selected.calories}</b> calories</span>
              <span><b>{selected.proteinGrams} g</b> protein</span>
            </> : <span>Select a saved food to preview its fixed values.</span>}
          </div>
          <div className={styles.savedActions}>
            <Button variant="primary" onClick={() => onAdd(selected)} disabled={!selected}>Add saved food</Button>
            <Button variant="secondary" onClick={() => onRequestDelete(selected)} disabled={!selected}>Delete saved food</Button>
          </div>
        </div>
      )}
    </section>
  )
}

function FoodRecordList({ records, onEdit, onRequestDelete }) {
  if (!records.length) {
    return <EmptyState message="No food logged for this day. Add food manually or from your saved foods." />
  }

  return (
    <ul className={styles.recordList} aria-label="Food records for selected date">
      {records.map(record => (
        <li key={record.id} className={styles.recordRow}>
          <div className={styles.recordMain}>
            <h4>{record.name}</h4>
            <p><span>{record.calories} calories</span><span>{record.proteinGrams} g protein</span></p>
          </div>
          <div className={styles.rowActions}>
            <Button variant="secondary" onClick={() => onEdit(record)} aria-label={`Edit ${record.name}`}>Edit</Button>
            <Button variant="secondary" onClick={() => onRequestDelete(record)} aria-label={`Delete ${record.name}`}>Delete</Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function FoodEditDialog({ record, onClose, onSave }) {
  const nameRef = useRef(null)
  const [form, setForm] = useState({ name: '', calories: '', proteinGrams: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!record) return
    setForm({ name: record.name, calories: String(record.calories), proteinGrams: String(record.proteinGrams) })
    setErrors({})
  }, [record])

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  function submit(event) {
    event.preventDefault()
    const validation = validateFoodInput(form)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    onSave(record, validation.value)
  }

  return (
    <Dialog
      open={Boolean(record)}
      title={`Edit ${record?.name ?? 'food'}`}
      description="This changes only this logged food occurrence."
      onClose={onClose}
      initialFocusRef={nameRef}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" form="wellness-edit-food-form">Save changes</Button>
      </>}
    >
      <form id="wellness-edit-food-form" className={styles.dialogForm} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="wellness-edit-food-name">Food name</label>
          <input
            ref={nameRef}
            id="wellness-edit-food-name"
            value={form.name}
            maxLength={FOOD_NAME_LIMIT}
            onChange={event => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'wellness-edit-food-name-error' : undefined}
          />
          <FieldError id="wellness-edit-food-name-error" message={errors.name} />
        </div>
        <div className={styles.dialogFormGrid}>
          <div className={styles.field}>
            <label htmlFor="wellness-edit-food-calories">Calories</label>
            <input
              id="wellness-edit-food-calories"
              type="number"
              min="0"
              max="20000"
              step="1"
              value={form.calories}
              onChange={event => updateField('calories', event.target.value)}
              aria-invalid={Boolean(errors.calories)}
              aria-describedby={errors.calories ? 'wellness-edit-food-calories-error' : undefined}
            />
            <FieldError id="wellness-edit-food-calories-error" message={errors.calories} />
          </div>
          <div className={styles.field}>
            <label htmlFor="wellness-edit-food-protein">Protein (g)</label>
            <input
              id="wellness-edit-food-protein"
              type="number"
              min="0"
              max="1000"
              step="1"
              value={form.proteinGrams}
              onChange={event => updateField('proteinGrams', event.target.value)}
              aria-invalid={Boolean(errors.proteinGrams)}
              aria-describedby={errors.proteinGrams ? 'wellness-edit-food-protein-error' : undefined}
            />
            <FieldError id="wellness-edit-food-protein-error" message={errors.proteinGrams} />
          </div>
        </div>
      </form>
    </Dialog>
  )
}

function WeightChart({ series }) {
  const { points, startDate, endDate } = series
  const chart = { left: 38, top: 16, width: 304, height: 172 }
  const bounds = useMemo(() => getWeightChartBounds(points), [points])
  const coordinates = useMemo(() => getWeightChartCoordinates(points, {
    startDate,
    endDate,
    width: chart.width,
    height: chart.height,
    bounds,
  }), [bounds, endDate, points, startDate])
  const midDate = toLocalDateKey(addDays(parseLocalDateKey(startDate) ?? new Date(), 14))
  const polyline = coordinates.map(point => `${chart.left + point.x},${chart.top + point.y}`).join(' ')

  return (
    <figure className={styles.chart} aria-labelledby="weight-chart-title">
      <figcaption id="weight-chart-title">Weight Trend</figcaption>
      {points.length === 0 ? (
        <EmptyState message="No weight entries in the last four weeks. Record a weight to start the chart." />
      ) : <>
        <svg className={styles.chartSvg} viewBox="0 0 360 232" role="img" aria-label={`Weight records from ${formatDate(startDate)} through ${formatDate(endDate)}`}>
          <line className={styles.chartGridLine} x1={chart.left} x2={chart.left + chart.width} y1={chart.top} y2={chart.top} />
          <line className={styles.chartGridLine} x1={chart.left} x2={chart.left + chart.width} y1={chart.top + chart.height} y2={chart.top + chart.height} />
          <line className={styles.chartAxis} x1={chart.left} x2={chart.left + chart.width} y1={chart.top + chart.height} y2={chart.top + chart.height} />
          <text className={styles.chartAxisLabel} x={chart.left - 8} y={chart.top + 4} textAnchor="end">{bounds.max.toFixed(1)}</text>
          <text className={styles.chartAxisLabel} x={chart.left - 8} y={chart.top + chart.height} textAnchor="end">{bounds.min.toFixed(1)}</text>
          {coordinates.length > 1 && <polyline className={styles.chartLine} points={polyline} />}
          {coordinates.map(point => (
            <circle
              key={point.date}
              className={styles.chartPoint}
              cx={chart.left + point.x}
              cy={chart.top + point.y}
              r="4.5"
              tabIndex="0"
              aria-label={`${formatDate(point.date)}: ${formatWeight(point.weightKg)}`}
            >
              <title>{formatDate(point.date)}: {formatWeight(point.weightKg)}</title>
            </circle>
          ))}
          <text className={styles.chartDateLabel} x={chart.left} y="218" textAnchor="start">{formatDate(startDate, { month: 'short', day: 'numeric' })}</text>
          <text className={styles.chartDateLabel} x={chart.left + chart.width / 2} y="218" textAnchor="middle">{formatDate(midDate, { month: 'short', day: 'numeric' })}</text>
          <text className={styles.chartDateLabel} x={chart.left + chart.width} y="218" textAnchor="end">Today</text>
        </svg>
        <ul className={styles.visuallyHidden} aria-label="Weight records represented in the chart">
          {points.map(point => <li key={point.date}>{formatDate(point.date)}: {formatWeight(point.weightKg)}</li>)}
        </ul>
      </>}
    </figure>
  )
}

function WeightEditDialog({ record, onClose, onSave }) {
  const inputRef = useRef(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!record) return
    setValue(record.weightKg.toFixed(1))
    setError('')
  }, [record])

  function submit(event) {
    event.preventDefault()
    const validation = validateWeightKg(value)
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    onSave(record, validation.value)
  }

  return (
    <Dialog
      open={Boolean(record)}
      title={`Edit weight for ${record ? formatDate(record.date) : ''}`}
      description="The date stays the same; this replaces its kilogram value."
      onClose={onClose}
      initialFocusRef={inputRef}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" form="wellness-edit-weight-form">Save changes</Button>
      </>}
    >
      <form id="wellness-edit-weight-form" className={styles.dialogForm} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="wellness-edit-weight">Weight (kg)</label>
          <input
            ref={inputRef}
            id="wellness-edit-weight"
            type="number"
            inputMode="decimal"
            min="20"
            max="500"
            step="0.1"
            value={value}
            onChange={event => { setValue(event.target.value); setError('') }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'wellness-edit-weight-error' : undefined}
          />
          <FieldError id="wellness-edit-weight-error" message={error} />
        </div>
      </form>
    </Dialog>
  )
}

function WeightTracker({ records, onSetRecords, onRequestDelete }) {
  const [weightDate, setWeightDate] = useState(todayKey)
  const [weightValue, setWeightValue] = useState('')
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')
  const [editingRecord, setEditingRecord] = useState(null)
  const { showToast } = useToast()
  const normalizedRecords = useMemo(() => normalizeWeightRecords(records), [records])
  const selectedRecord = normalizedRecords[weightDate] ?? null
  const now = new Date()
  const series = buildVisibleWeightSeries(normalizedRecords, now)
  const currentWeight = getCurrentWeight(normalizedRecords, now)
  const visibleChange = getVisiblePeriodChange(normalizedRecords, now)
  const recentRecords = [...series.points].reverse()

  useEffect(() => {
    setWeightValue(selectedRecord ? selectedRecord.weightKg.toFixed(1) : '')
    setError('')
  }, [selectedRecord, weightDate])

  function changeDate(value) {
    const today = todayKey()
    if (!isLocalDateKey(value) || value > today) {
      setDateError('Choose today or an earlier date.')
      return
    }
    setDateError('')
    setWeightDate(value)
  }

  function submit(event) {
    event.preventDefault()
    const validation = validateWeightKg(weightValue)
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    const isUpdate = Boolean(selectedRecord)
    onSetRecords(previous => upsertWeightRecord(previous, weightDate, validation.value, Date.now()))
    setWeightValue(validation.value.toFixed(1))
    setError('')
    showToast(isUpdate ? 'Weight updated.' : 'Weight added.')
  }

  function saveEdit(record, weightKg) {
    onSetRecords(previous => upsertWeightRecord(previous, record.date, weightKg, Date.now()))
    setEditingRecord(null)
    showToast('Weight updated.')
  }

  return (
    <section className={styles.tracker} aria-labelledby="weight-heading">
      <div className={styles.trackerHeader}>
        <div>
          <h2 id="weight-heading">Weight tracking</h2>
        </div>
        <dl className={styles.weightMetrics}>
          <div>
            <dt>Current weight</dt>
            <dd>{currentWeight ? formatWeight(currentWeight.weightKg) : '—'}</dd>
          </div>
          <div>
            <dt>Four-week change</dt>
            <dd>{formatWeightChange(visibleChange)}</dd>
          </div>
        </dl>
      </div>

      <form className={styles.weightForm} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="wellness-weight-date">Date</label>
          <input
            id="wellness-weight-date"
            type="date"
            value={weightDate}
            max={todayKey()}
            onChange={event => changeDate(event.target.value)}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? 'wellness-weight-date-error' : undefined}
          />
          <FieldError id="wellness-weight-date-error" message={dateError} />
        </div>
        <div className={styles.field}>
          <label htmlFor="wellness-weight-value">Weight (kg)</label>
          <input
            id="wellness-weight-value"
            type="number"
            inputMode="decimal"
            min="20"
            max="500"
            step="0.1"
            value={weightValue}
            onChange={event => { setWeightValue(event.target.value); setError('') }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'wellness-weight-value-error' : undefined}
          />
          <FieldError id="wellness-weight-value-error" message={error} />
        </div>
        <Button type="submit" variant="primary">{selectedRecord ? 'Update weight' : 'Add weight'}</Button>
      </form>

      <WeightChart series={series} />

      <div className={styles.weightRecords}>
        <h3>Recent weight entries</h3>
        {recentRecords.length === 0 ? (
          <p className={styles.listEmpty}>No entries in this four-week window.</p>
        ) : (
          <ul className={styles.recordList} aria-label="Recent weight records">
            {recentRecords.map(record => (
              <li key={record.date} className={styles.recordRow}>
                <div className={styles.recordMain}>
                  <h4>{formatDate(record.date)}</h4>
                  <p><span>{formatWeight(record.weightKg)}</span></p>
                </div>
                <div className={styles.rowActions}>
                  <Button variant="secondary" onClick={() => setEditingRecord(record)} aria-label={`Edit weight for ${formatDate(record.date)}`}>Edit</Button>
                  <Button variant="secondary" onClick={() => onRequestDelete(record)} aria-label={`Delete weight for ${formatDate(record.date)}`}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <WeightEditDialog record={editingRecord} onClose={() => setEditingRecord(null)} onSave={saveEdit} />
    </section>
  )
}

export default function Wellness() {
  const [storedFoodRecords, setFoodRecords] = useSyncedStorage('wellness_food_records', [])
  const [storedSavedFoods, setSavedFoods] = useSyncedStorage('wellness_saved_foods', [])
  const [storedWeightRecords, setWeightRecords] = useSyncedStorage('wellness_weight_records', {})
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [selectedSavedFoodId, setSelectedSavedFoodId] = useState('')
  const [editingFood, setEditingFood] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const cancelDeleteRef = useRef(null)
  const { showToast } = useToast()

  const foodRecords = useMemo(() => normalizeFoodRecords(storedFoodRecords), [storedFoodRecords])
  const savedFoods = useMemo(() => normalizeSavedFoods(storedSavedFoods), [storedSavedFoods])
  const selectedRecords = useMemo(() => getFoodRecordsForDate(foodRecords, selectedDate), [foodRecords, selectedDate])
  const totals = useMemo(() => getDailyNutritionTotals(foodRecords, selectedDate), [foodRecords, selectedDate])

  useEffect(() => {
    if (selectedSavedFoodId && !savedFoods.some(food => food.id === selectedSavedFoodId)) setSelectedSavedFoodId('')
  }, [savedFoods, selectedSavedFoodId])

  function selectNutritionDate(value) {
    if (!isLocalDateKey(value) || value > todayKey()) return
    setSelectedDate(value)
  }

  function addManualFood(value, saveAsReusable) {
    const timestamp = Date.now()
    const record = {
      id: createWellnessId('food'),
      date: selectedDate,
      ...value,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    setFoodRecords(previous => [...normalizeFoodRecords(previous), record])

    if (!saveAsReusable) {
      showToast('Food added.')
      return
    }

    const duplicate = hasExactSavedFoodDuplicate(savedFoods, value)
    if (duplicate) {
      showToast('Food added. This reusable food already exists.')
      return
    }
    const savedFood = { id: createWellnessId('saved_food'), ...value, createdAt: timestamp }
    setSavedFoods(previous => [...normalizeSavedFoods(previous), savedFood])
    setSelectedSavedFoodId(savedFood.id)
    showToast('Food added and saved for reuse.')
  }

  function addSavedFood(food) {
    if (!food) return
    const timestamp = Date.now()
    const record = {
      id: createWellnessId('food'),
      date: selectedDate,
      name: food.name,
      calories: food.calories,
      proteinGrams: food.proteinGrams,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    setFoodRecords(previous => [...normalizeFoodRecords(previous), record])
    showToast('Saved food added.')
  }

  function saveFoodEdit(record, value) {
    setFoodRecords(previous => normalizeFoodRecords(previous).map(item => item.id === record.id ? {
      ...item,
      ...value,
      updatedAt: Date.now(),
    } : item))
    setEditingFood(null)
    showToast('Food updated.')
  }

  function confirmDelete() {
    if (!pendingDelete) return
    if (pendingDelete.kind === 'food') {
      setFoodRecords(previous => normalizeFoodRecords(previous).filter(record => record.id !== pendingDelete.record.id))
      showToast('Food deleted.')
    } else if (pendingDelete.kind === 'saved-food') {
      setSavedFoods(previous => normalizeSavedFoods(previous).filter(food => food.id !== pendingDelete.food.id))
      setSelectedSavedFoodId('')
      showToast('Saved food deleted.')
    } else if (pendingDelete.kind === 'weight') {
      setWeightRecords(previous => removeWeightRecord(previous, pendingDelete.record.date))
      showToast('Weight deleted.')
    }
    setPendingDelete(null)
  }

  const deleteTitle = pendingDelete?.kind === 'food'
    ? `Delete ${pendingDelete.record.name}?`
    : pendingDelete?.kind === 'saved-food'
      ? `Delete saved food ${pendingDelete.food.name}?`
      : pendingDelete?.kind === 'weight'
        ? `Delete weight for ${formatDate(pendingDelete.record.date)}?`
        : 'Delete record?'
  const deleteDescription = pendingDelete?.kind === 'food'
    ? `Delete ${pendingDelete.record.name} from ${formatDate(selectedDate)}? This cannot be undone.`
    : pendingDelete?.kind === 'saved-food'
      ? `Delete the reusable ${pendingDelete.food.name} template? Existing food records will not change.`
      : pendingDelete?.kind === 'weight'
        ? `Delete ${formatWeight(pendingDelete.record.weightKg)} recorded on ${formatDate(pendingDelete.record.date)}? This cannot be undone.`
        : ''

  return (
    <div className={styles.page}>
      <section className={styles.tracker} aria-labelledby="nutrition-heading">
        <div className={`${styles.trackerHeader} ${styles.nutritionHeader}`}>
          <div>
            <h2 id="nutrition-heading">Daily food log</h2>
          </div>
          <DateNavigator selectedDate={selectedDate} onSelectDate={selectNutritionDate} />
          <dl className={styles.nutritionTotals} aria-label="Selected day nutrition totals">
            <div><dt>Calories</dt><dd>{totals.calories.toLocaleString()}</dd></div>
            <div><dt>Protein</dt><dd>{totals.proteinGrams.toLocaleString()} g</dd></div>
          </dl>
        </div>

        <ManualFoodForm onAdd={addManualFood} />
        <SavedFoodControl
          savedFoods={savedFoods}
          selectedSavedFoodId={selectedSavedFoodId}
          onSelect={setSelectedSavedFoodId}
          onAdd={addSavedFood}
          onRequestDelete={food => food && setPendingDelete({ kind: 'saved-food', food })}
        />
        <div className={styles.recordsSection}>
          <h3>Food entries</h3>
          <FoodRecordList
            records={selectedRecords}
            onEdit={setEditingFood}
            onRequestDelete={record => setPendingDelete({ kind: 'food', record })}
          />
        </div>
      </section>

      <WeightTracker
        records={storedWeightRecords}
        onSetRecords={setWeightRecords}
        onRequestDelete={record => setPendingDelete({ kind: 'weight', record })}
      />

      <FoodEditDialog record={editingFood} onClose={() => setEditingFood(null)} onSave={saveFoodEdit} />
      <Dialog
        open={Boolean(pendingDelete)}
        title={deleteTitle}
        description={deleteDescription}
        destructive
        onClose={() => setPendingDelete(null)}
        initialFocusRef={cancelDeleteRef}
        footer={<>
          <Button ref={cancelDeleteRef} variant="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </>}
      />
    </div>
  )
}
