import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../utils/api'

export default function UserPublic() {
  const { id } = useParams()
  const [u, setU] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState<number | null>(null)
  const [liked, setLiked] = useState<Set<number>>(new Set())
  useEffect(() => { (async () => { try { const res = await api.get(`/users/${id}`); setU(res.data); setLiked(new Set((res.data.recipes||[]).filter((r:any)=>r.liked_by_me).map((r:any)=>r.id))) } finally { setLoading(false) } })() }, [id])
  if (loading) return <div>Загрузка…</div>
  if (!u) return <div>Не найдено</div>

  const toggleLike = async (rid: number) => {
    try {
      setLiking(rid)
      const res = await api.post(`/recipes/${rid}/like`)
      const isLiked = !!res.data?.liked
      setLiked(prev => { const ns = new Set(prev); if (isLiked) ns.add(rid); else ns.delete(rid); return ns })
      // обновим счетчики: перезагрузим профиль
      const fresh = await api.get(`/users/${id}`)
      setU(fresh.data)
    } catch (e) { console.error(e) }
    finally { setLiking(null) }
  }

  const heartClass = (rid: number) => (liking===rid || liked.has(rid) ? 'text-red-600' : 'text-neutral-400') + ' hover:text-red-600 transition-colors'
  return (
    <section className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        {u.photo_path ? <img src={u.photo_path} className="w-20 h-20 rounded-full object-cover" /> : <div className="w-20 h-20 rounded-full bg-neutral-200" />}
        <div>
          <div className="font-medium">{u.nickname || 'без ника'}</div>
          <div className="text-sm text-neutral-500">{u.email}</div>
        </div>
      </div>
      <div>
        <h2 className="font-semibold mb-2">Рецепты</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {u.recipes?.map((r:any) => (
            <a key={r.id} className="border rounded block hover:shadow" href={`/recipes/${r.id}`}>
              {r.photo_path && <img src={r.photo_path} className="w-full h-28 object-cover" />}
              <div className="p-3">
                <div className="text-sm text-neutral-500 flex items-center justify-between">
                  <span>{r.topic}</span>
                  {typeof r.likes_count === 'number' && (
                    <button
                      className={heartClass(r.id)}
                      onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); toggleLike(r.id) }}
                      aria-label="like"
                    >
                      ❤ {r.likes_count}
                    </button>
                  )}
                </div>
                <div className="font-medium">{r.title}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}


