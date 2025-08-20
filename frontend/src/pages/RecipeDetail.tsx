import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import { useAppSelector } from '../hooks/useRedux'

interface Author { id:number; email:string; nickname?:string|null; photo_path?:string|null }
interface Ingredient { name:string; quantity:string }
interface Step { order_index:number; text:string; photo_path?:string|null }

export default function RecipeDetail() {
  const { id } = useParams()
  const [item, setItem] = useState<any>(null)
  const currentUser = useAppSelector(s => s.auth.user)
  const token = useAppSelector(s => s.auth.token)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const load = async () => {
    const res = await api.get(`/recipes/${id}`)
    setItem(res.data)
  }
  const loadComments = async () => {
    const res = await api.get(`/recipes/${id}/comments`)
    setComments(res.data)
  }

  useEffect(() => { (async () => { await load(); await loadComments() })() }, [id])

  const submitComment = async () => {
    if (!token) { alert('Нужно войти, чтобы комментировать'); return }
    const content = newComment.trim(); if (!content) return
    const form = new FormData(); form.append('content', content)
    await api.post(`/recipes/${id}/comments`, form)
    setNewComment(''); await loadComments()
  }
  const startEdit = (c: any) => { setEditingId(c.id); setEditText(c.content) }
  const saveEdit = async () => {
    if (!editingId) return; const content = editText.trim(); if (!content) return
    const form = new FormData(); form.append('content', content)
    await api.put(`/recipes/${id}/comments/${editingId}`, form)
    setEditingId(null); setEditText(''); await loadComments()
  }
  const removeComment = async (cid: number) => {
    await api.delete(`/recipes/${id}/comments/${cid}`)
    await loadComments()
  }

  if (!item) return <div>Загрузка…</div>

  const topicLabel = (t: string) => ({ breakfast: 'завтрак', lunch: 'обед', dinner: 'ужин' } as any)[t] || t

  return (
    <article className="max-w-3xl mx-auto">
      <div className="w-full max-h-96 rounded bg-neutral-50 flex items-center justify-center overflow-hidden">
        {item.photo_path ? (
          <img src={item.photo_path} className="w-full object-contain" />
        ) : (
          <div className="text-sm text-neutral-400 py-8">Нет фото</div>
        )}
      </div>
      <h1 className="text-2xl font-semibold mt-4">{item.title}</h1>
      {currentUser && item.author?.id === currentUser.id && (
        <div className="mt-2">
          <Link to={`/recipes/${item.id}/edit`} className="text-sm border rounded px-2 py-1">Редактировать</Link>
        </div>
      )}
      <div className="text-sm text-neutral-500 mt-1">
        {topicLabel(item.topic)} • {new Date(item.created_at).toISOString().slice(0,10)} • Автор: {item.author?.nickname || item.author?.email}
      </div>

      {item.ingredients?.length ? (
        <section className="mt-4 p-4 border rounded bg-neutral-50">
          <h2 className="font-medium mb-2">Ингредиенты</h2>
          <ul className="list-disc pl-5">
            {item.ingredients.map((ing: Ingredient, idx: number) => (
              <li key={idx}>{ing.name} — {ing.quantity}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 pt-4 space-y-4 border-t">
        <h2 className="font-medium">Пошаговое приготовление</h2>
        {item.steps?.length ? item.steps.map((s: Step, i: number) => (
          <div key={i} className="border rounded p-3">
            <div className="font-medium mb-1">Шаг {s.order_index}</div>
            <div className="text-sm whitespace-pre-wrap">{s.text}</div>
            {s.photo_path && <img src={s.photo_path} className="mt-2 rounded max-h-72 object-contain bg-neutral-50" />}
          </div>
        )) : <div className="text-sm text-neutral-500">Шаги не добавлены</div>}
      </section>
      <section className="mt-6">
        <h2 className="font-medium mb-2">Комментарии</h2>
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="text-sm">
              <span className="text-neutral-500">{c.author?.nickname || c.author?.email}:</span>{' '}
              {editingId === c.id ? (
                <>
                  <input className="border rounded px-2 py-1" value={editText} onChange={e=>setEditText(e.target.value)} />
                  <button className="ml-2 text-xs border rounded px-2" onClick={saveEdit}>Сохранить</button>
                </>
              ) : (
                <>
                  <span>{c.content}</span>
                  {c.can_edit && <button className="ml-2 text-xs text-blue-600" onClick={()=>startEdit(c)}>Изменить</button>}
                  {c.can_delete && <button className="ml-2 text-xs text-red-600" onClick={()=>removeComment(c.id)}>Удалить</button>}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Написать комментарий..." className="border rounded px-2 py-1 flex-1" />
          <button type="button" className="border rounded px-3" onClick={submitComment}>Отправить</button>
        </div>
      </section>
    </article>
  )
}


