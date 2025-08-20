import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import { useAppDispatch, useAppSelector } from '../hooks/useRedux'
import { setPopular } from '../redux/slices/recipes'

interface Author { id:number; email:string; nickname?:string|null; photo_path?:string|null }
interface CommentItem { id:number; author: Author; content:string; created_at:string; can_edit:boolean; can_delete:boolean }
interface Recipe { id:number; title:string; description?:string; likes_count:number; liked_by_me?: boolean | null; created_at: string; photo_path?:string|null; ingredients?:{name:string; quantity:string}[]; author?: Author }

export default function Popular() {
  const dispatch = useAppDispatch()
  const items = useAppSelector(s => s.recipes.popular) as Recipe[]
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [liking, setLiking] = useState<number | null>(null)
  const [liked, setLiked] = useState<Set<number>>(new Set())
  const [comments, setComments] = useState<Record<number, CommentItem[]>>({})
  const [newComment, setNewComment] = useState<Record<number, string>>({})
  const token = useAppSelector(s => s.auth.token)
  const currentUser = useAppSelector(s => s.auth.user)
  const [editing, setEditing] = useState<Record<number, number | null>>({})
  const [editText, setEditText] = useState<Record<number, string>>({})
  const load = async () => { const res = await api.get('/recipes/popular'); dispatch(setPopular(res.data)) }
  useEffect(() => { (async () => { await load() })() }, [])

  const toggleLike = async (id: number) => {
    try { setLiking(id); const res = await api.post(`/recipes/${id}/like`); const isLiked = !!res.data?.liked; setLiked(p=>{const ns=new Set(p); if(isLiked) ns.add(id); else ns.delete(id); return ns}); await load() } catch (e) { console.error(e) } finally { setLiking(null) }
  }

  const heartClass = (id:number) => (liking===id || liked.has(id) || items.find(x=>x.id===id)?.liked_by_me ? 'text-red-600' : 'text-neutral-400') + ' hover:text-red-600 transition-colors'

  const ensureComments = async (id: number) => {
    if (comments[id]) return
    const res = await api.get(`/recipes/${id}/comments`)
    setComments(prev => ({ ...prev, [id]: res.data }))
  }

  const submitComment = async (id: number) => {
    if (!token) { alert('Нужно войти, чтобы комментировать'); return }
    const content = (newComment[id] || '').trim()
    if (!content) return
    const form = new FormData()
    form.append('content', content)
    await api.post(`/recipes/${id}/comments`, form)
    setNewComment(prev => ({ ...prev, [id]: '' }))
    const res = await api.get(`/recipes/${id}/comments`)
    setComments(prev => ({ ...prev, [id]: res.data }))
  }

  const startEdit = (recipeId: number, c: CommentItem) => {
    setEditing(prev => ({ ...prev, [recipeId]: c.id }))
    setEditText(prev => ({ ...prev, [recipeId]: c.content }))
  }

  const saveEdit = async (recipeId: number) => {
    const cid = editing[recipeId]
    if (!cid) return
    const content = (editText[recipeId] || '').trim()
    if (!content) return
    const form = new FormData()
    form.append('content', content)
    await api.put(`/recipes/${recipeId}/comments/${cid}`, form)
    setEditing(prev => ({ ...prev, [recipeId]: null }))
    const res = await api.get(`/recipes/${recipeId}/comments`)
    setComments(prev => ({ ...prev, [recipeId]: res.data }))
  }

  const removeComment = async (recipeId: number, commentId: number) => {
    await api.delete(`/recipes/${recipeId}/comments/${commentId}`)
    const res = await api.get(`/recipes/${recipeId}/comments`)
    setComments(prev => ({ ...prev, [recipeId]: res.data }))
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">Популярное</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(r => (
          <article key={r.id} className="border rounded-lg overflow-hidden bg-white">
            {r.photo_path && <img src={r.photo_path} className="w-full max-h-60 object-contain bg-neutral-50" />}
            <div className="p-3">
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <button aria-label="like" onClick={()=>toggleLike(r.id)} className={heartClass(r.id)}>
                  ❤ {r.likes_count}
                </button>
              </div>
              <a
                className="font-medium cursor-pointer hover:underline"
                href={`/recipes/${r.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {r.title}
              </a>
              {r.author && (
                <div className="text-xs text-neutral-500 mt-1">
                  Автор: <a className="underline hover:text-primary" href={`/users/${r.author.id}`} target="_blank" rel="noreferrer">{r.author.nickname || r.author.email}</a>
                </div>
              )}
              {expanded[r.id] && (
                <div className="text-sm text-neutral-700 mt-2 space-y-2">
                  {r.ingredients?.length ? (
                    <ul className="list-disc pl-5 text-neutral-800">
                      {r.ingredients.map((ing, idx) => (
                        <li key={idx}>{ing.name} — {ing.quantity}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="whitespace-pre-wrap">{r.description}</div>
                  <div className="pt-2 border-t mt-2">
                    <div className="font-medium mb-1">Комментарии</div>
                    <div className="space-y-2">
                      {(comments[r.id] || []).map((c) => (
                        <div key={c.id} className="text-neutral-800">
                          <span className="text-xs text-neutral-500">{c.author.nickname || c.author.email}:</span>{' '}
                          {editing[r.id] === c.id ? (
                            <>
                              <input className="border rounded px-1 py-0.5 ml-1" value={editText[r.id] || ''} onChange={e=>setEditText(p=>({...p, [r.id]: e.target.value}))} />
                              <button className="ml-2 text-xs border rounded px-2" onClick={()=>saveEdit(r.id)}>Сохранить</button>
                            </>
                          ) : (
                            <>
                              <span>{c.content}</span>
                              {c.can_edit && (
                                <button className="ml-2 text-xs text-blue-600" onClick={()=>startEdit(r.id, c)}>Изменить</button>
                              )}
                              {c.can_delete && (
                                <button className="ml-2 text-xs text-red-600" onClick={()=>removeComment(r.id, c.id)}>Удалить</button>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={newComment[r.id] || ''}
                        onChange={e=>setNewComment(prev=>({...prev, [r.id]: e.target.value}))}
                        placeholder="Написать комментарий..."
                        className="border rounded px-2 py-1 flex-1"
                      />
                      <button className="px-3 py-1 border rounded" onClick={()=>submitComment(r.id)}>Отправить</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
