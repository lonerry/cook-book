import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'

interface IngredientRow { name: string; quantity: string }
interface StepRow { text: string; file?: File | null }

export default function RecipeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState<'breakfast'|'lunch'|'dinner'>('breakfast')
  const [rows, setRows] = useState<IngredientRow[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [steps, setSteps] = useState<StepRow[]>([])

  useEffect(() => { (async () => {
    try {
      const res = await api.get(`/recipes/${id}`)
      const r = res.data
      setTitle(r.title); setDescription(r.description); setTopic(r.topic)
      setRows(r.ingredients || [])
      setSteps((r.steps || []).map((s:any)=>({ text: s.text, file: null })))
    } catch (e) { setError('Не удалось загрузить рецепт') }
    finally { setLoading(false) }
  })() }, [id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const form = new FormData()
    form.append('title', title)
    form.append('description', description)
    form.append('topic', topic)
    form.append('ingredients', JSON.stringify(rows))
    const stepsClean = steps.map(s => ({ text: s.text, with_file: !!s.file }))
    form.append('steps', JSON.stringify(stepsClean))
    steps.forEach(s => { if (s.file) form.append('step_photos', s.file as Blob, (s.file as File).name) })
    if (photo) form.append('photo', photo)
    try {
      await api.put(`/recipes/${id}`, form)
      navigate(`/recipes/${id}`)
    } catch (e: any) {
      const data = e?.response?.data; let msg = 'Не удалось сохранить'
      if (data?.detail) msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
      setError(msg)
    }
  }

  if (loading) return <div>Загрузка…</div>

  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold">Редактировать рецепт</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Название" className="w-full border rounded px-3 py-2" />
      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Описание" className="w-full border rounded px-3 py-2" rows={4} />
      <select value={topic} onChange={e=>setTopic(e.target.value as any)} className="w-full border rounded px-3 py-2">
        <option value="breakfast">Завтрак</option>
        <option value="lunch">Обед</option>
        <option value="dinner">Ужин</option>
      </select>

      <div className="space-y-2">
        <div className="font-medium">Ингредиенты</div>
        {rows.map((row, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input value={row.name} onChange={e=>setRows(r=>r.map((x,i)=>i===idx?{...x, name:e.target.value}:x))} placeholder="Название" className="flex-1 border rounded px-3 py-2" />
            <input value={row.quantity} onChange={e=>setRows(r=>r.map((x,i)=>i===idx?{...x, quantity:e.target.value}:x))} placeholder="Количество" className="w-48 border rounded px-3 py-2" />
            <button type="button" className="text-sm text-red-600 border rounded px-2 py-1" onClick={()=>setRows(r=>r.filter((_,i)=>i!==idx))}>Удалить</button>
          </div>
        ))}
        <button type="button" className="text-sm border rounded px-2 py-1" onClick={()=>setRows(r=>[...r,{name:'',quantity:''}])}>+ Добавить ингредиент</button>
      </div>

      <div className="space-y-2">
        <div className="font-medium">Шаги</div>
        {steps.map((s, idx) => (
          <div key={idx} className="space-y-2 border rounded p-2">
            <div className="text-sm text-neutral-600">Шаг {idx+1}</div>
            <textarea value={s.text} onChange={e=>setSteps(arr=>arr.map((x,i)=>i===idx?{...x, text:e.target.value}:x))} placeholder="Описание шага" className="w-full border rounded px-3 py-2" rows={3} />
            <input type="file" onChange={e=>setSteps(arr=>arr.map((x,i)=>i===idx?{...x, file:e.target.files?.[0] || null}:x))} />
            <div className="flex gap-2">
              <button type="button" className="text-sm border rounded px-2 py-1" onClick={()=>setSteps(arr=>[...arr, { text:'', file:null }])}>+ Добавить шаг</button>
              {steps.length>1 && <button type="button" className="text-sm text-red-600 border rounded px-2 py-1" onClick={()=>setSteps(arr=>arr.filter((_,i)=>i!==idx))}>Удалить шаг</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="font-medium">Обложка</div>
        <input type="file" onChange={e=>setPhoto(e.target.files?.[0] || null)} />
      </div>

      <button className="bg-primary text-white rounded px-3 py-2">Сохранить</button>
    </form>
  )
}


