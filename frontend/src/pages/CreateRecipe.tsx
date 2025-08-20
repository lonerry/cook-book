import React, { useState } from 'react'
import api from '../utils/api'
import { useNavigate } from 'react-router-dom'

interface IngredientRow { name: string; quantity: string }
interface StepRow { text: string; file?: File | null }

export default function CreateRecipe() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState<'breakfast'|'lunch'|'dinner'>('breakfast')
  const [rows, setRows] = useState<IngredientRow[]>([{ name: '', quantity: '' }])
  const [photo, setPhoto] = useState<File | null>(null)
  const [steps, setSteps] = useState<StepRow[]>([{ text: '', file: null }])
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const addRow = () => setRows(r => [...r, { name: '', quantity: '' }])
  const removeRow = (i: number) => setRows(r => r.length > 1 ? r.filter((_, idx) => idx !== i) : r)
  const changeRow = (i: number, key: keyof IngredientRow, val: string) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: val } : row))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const cleaned = rows.filter(r => r.name.trim())
    if (!cleaned.length) { setError('Добавьте хотя бы один ингредиент'); return }
    const form = new FormData()
    form.append('title', title)
    form.append('description', description)
    form.append('topic', topic)
    form.append('ingredients', JSON.stringify(cleaned))
    // steps: передаём JSON текстов и массив файлов step_photos[] по индексам
    const stepsClean = steps.filter(s => s.text.trim())
    // Передаём признак с файлом, чтобы бэкенд правильно сопоставил порядок файлов
    form.append('steps', JSON.stringify(stepsClean.map(s => ({ text: s.text, with_file: !!s.file }))))
    stepsClean.forEach(s => { if (s.file) form.append('step_photos', s.file) })
    if (photo) form.append('photo', photo)
    try {
      await api.post('/recipes', form)
      navigate('/')
    } catch (e: any) {
      // Не рендерим объект в JSX, приводим ошибку к строке
      const data = e?.response?.data
      let msg = 'Не удалось создать рецепт'
      if (data?.detail) {
        if (typeof data.detail === 'string') msg = data.detail
        else if (data.detail?.message) msg = data.detail.message
        else if (Array.isArray(data.detail)) msg = data.detail.map((x:any)=>x?.msg || '').filter(Boolean).join('; ')
        else msg = JSON.stringify(data.detail)
      } else if (e?.message) {
        msg = e.message
      }
      console.error('Create recipe error:', data || e)
      setError(msg)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold">Новый рецепт</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="space-y-1">
        <div className="font-medium">Обложка</div>
        <div className="flex items-center gap-3">
          <input
            id="cover_input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e=>setPhoto(e.target.files?.[0] || null)}
          />
          <label
            htmlFor="cover_input"
            className="inline-flex items-center px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-neutral-50 cursor-pointer"
          >
            Выбрать файл
          </label>
          <span className="text-sm text-neutral-500">{photo ? photo.name : 'файл не выбран'}</span>
          {photo && (
            <button
              type="button"
              className="text-xs text-neutral-500 hover:text-red-600 underline"
              onClick={()=>setPhoto(null)}
            >
              Очистить
            </button>
          )}
        </div>
      </div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Название" className="w-full border rounded px-3 py-2" />
      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Описание (необязательно)" className="w-full border rounded px-3 py-2" rows={4} />
      <select value={topic} onChange={e=>setTopic(e.target.value as any)} className="w-full border rounded px-3 py-2">
        <option value="breakfast">Завтрак</option>
        <option value="lunch">Обед</option>
        <option value="dinner">Ужин</option>
      </select>

      <div className="space-y-2">
        <div className="font-medium">Ингредиенты</div>
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input value={row.name} onChange={e=>changeRow(idx,'name',e.target.value)} placeholder="Название (например, морковь)" className="flex-1 border rounded px-3 py-2" />
            <input value={row.quantity} onChange={e=>changeRow(idx,'quantity',e.target.value)} placeholder="Количество (например, 200 г)" className="w-48 border rounded px-3 py-2" />
            <button type="button" onClick={()=>removeRow(idx)} className="text-sm text-red-600 border rounded px-2 py-1">Удалить</button>
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-sm text-primary border rounded px-2 py-1">+ Добавить ингредиент</button>
      </div>

      <div className="space-y-2">
        <div className="font-medium">Пошаговый рецепт</div>
        {steps.map((s, idx) => (
          <div key={idx} className="space-y-2 border rounded p-2">
            <div className="text-sm text-neutral-600">Шаг {idx+1}</div>
            <textarea value={s.text} onChange={e=>setSteps(arr=>arr.map((x,i)=>i===idx?{...x, text:e.target.value}:x))} placeholder="Описание шага" className="w-full border rounded px-3 py-2" rows={3} />
            <div className="flex items-center gap-3">
              <input
                id={`step_file_${idx}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e=>setSteps(arr=>arr.map((x,i)=>i===idx?{...x, file:e.target.files?.[0] || null}:x))}
              />
              <label
                htmlFor={`step_file_${idx}`}
                className="inline-flex items-center px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-neutral-50 cursor-pointer"
              >
                Выбрать файл
              </label>
              <span className="text-sm text-neutral-500">{s.file ? s.file.name : 'файл не выбран'}</span>
              {s.file && (
                <button
                  type="button"
                  className="text-xs text-neutral-500 hover:text-red-600 underline"
                  onClick={()=>setSteps(arr=>arr.map((x,i)=>i===idx?{...x, file:null}:x))}
                >
                  Очистить
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" className="text-sm border rounded px-2 py-1" onClick={()=>setSteps(arr=>[...arr, { text:'', file:null }])}>+ Добавить шаг</button>
              {steps.length>1 && (
                <button type="button" className="text-sm text-red-600 border rounded px-2 py-1" onClick={()=>setSteps(arr=>arr.filter((_,i)=>i!==idx))}>Удалить шаг</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="bg-primary text-white rounded px-3 py-2">Сохранить</button>
    </form>
  )
}
