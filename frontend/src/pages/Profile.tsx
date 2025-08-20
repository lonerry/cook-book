import React, { useEffect, useRef, useState } from 'react'
import api from '../utils/api'
import { useAppSelector } from '../hooks/useRedux'

interface RecipeItem { id: number; title: string; topic: string; photo_path?: string | null; description?: string; ingredients?: {name:string; quantity:string}[] }

export default function Profile() {
  const token = useAppSelector(s => s.auth.token)
  const [me, setMe] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [err, setErr] = useState<string | null>(null)
  const [isEditingNick, setIsEditingNick] = useState(false)
  const [savingNick, setSavingNick] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<'mine'|'favorites'|'settings'>('mine')
  const [favorites, setFavorites] = useState<RecipeItem[] | null>(null)
  const [oldPass, setOldPass] = useState('')
  const [newPass1, setNewPass1] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [passMsg, setPassMsg] = useState<string | null>(null)
  const [showPassForm, setShowPassForm] = useState(false)

  const load = async () => {
    const res = await api.get('/users/me')
    setMe(res.data)
    setNickname(res.data.nickname || '')
  }

  useEffect(() => { (async () => { if (!token) return; await load() })() }, [token])

  const loadFavorites = async () => {
    // Берём публичный список и фильтруем по liked_by_me
    const res = await api.get('/recipes', { params: { order: 'desc', limit: 100 } })
    const items = (res.data || []).filter((r: any) => r.liked_by_me)
    setFavorites(items)
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    const form = new FormData()
    form.append('file', e.target.files[0])
    const res = await api.post('/users/me/photo', form)
    const url = res.data?.photo_path
    if (url) setMe((prev:any)=> ({ ...prev, photo_path: url }))
  }
  const onDeletePhoto = async () => {
    await api.delete('/users/me/photo')
    setMe((prev:any)=> ({ ...prev, photo_path: null }))
  }

  const deleteRecipe = async (id: number) => {
    try {
      await api.delete(`/recipes/${id}`)
      await load()
    } catch (e) { console.error(e) }
  }

  const saveNickname = async () => {
    setErr(null)
    setSavingNick(true)
    try {
      const form = new FormData()
      form.append('nickname', nickname)
      await api.patch('/users/me', form)
      await load()
      setIsEditingNick(false)
    } catch (e: any) {
      setErr('Не удалось сохранить ник')
    } finally {
      setSavingNick(false)
    }
  }

  if (!token) return <div>Нужно войти</div>
  if (!me) return <div>Загрузка…</div>

  return (
    <section className="max-w-3xl space-y-6">
      {/* Шапка профиля */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <div className="relative group inline-block">
            {me.photo_path ? (
              <>
                <img src={me.photo_path} className="w-20 h-20 rounded-full object-cover" title="Изменить фото" />
                <label htmlFor="avatar_input" className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white cursor-pointer">Изменить</label>
              </>
            ) : (
              <div className="w-20 h-20 rounded-full bg-neutral-200 cursor-pointer flex items-center justify-center text-xs text-neutral-500" onClick={() => fileInputRef.current?.click()}>
                Выбрать фото
              </div>
            )}
            <input id="avatar_input" ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
          </div>
          {me.photo_path && (
            <div className="mt-1 text-[11px] text-neutral-400 hover:text-red-600 cursor-pointer text-center" onClick={onDeletePhoto}>Удалить фото</div>
          )}
        </div>
        <div className="flex-1">
          <div className="font-medium">{me.email}</div>
          <div className="text-sm text-neutral-500">{me.nickname || 'без ника'}</div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="border-b">
        <nav className="flex gap-4 text-sm">
          {[
            { v: 'mine', label: 'Мои рецепты' },
            { v: 'favorites', label: 'Избранное' },
            { v: 'settings', label: 'Настройки профиля' },
          ].map(t => (
            <button
              key={t.v}
              className={(tab===t.v ? 'border-b-2 border-primary text-neutral-900' : 'text-neutral-500 hover:text-neutral-800') + ' -mb-px px-2 py-2'}
              onClick={() => { setTab(t.v as any); if (t.v==='favorites' && favorites===null) loadFavorites() }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Контент вкладок */}
      {tab === 'mine' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {me.recipes?.map((r: RecipeItem) => (
            <div key={r.id} className="border rounded">
              {r.photo_path ? (
                <a href={`/recipes/${r.id}`} target="_blank" rel="noreferrer">
                  <img src={r.photo_path} className="w-full h-28 object-cover" />
                </a>
              ) : null}
              <div className="p-3">
                <div className="text-sm text-neutral-500 flex items-center justify-between">
                  <span>{r.topic}</span>
                  {typeof (r as any).likes_count === 'number' && <span>❤ {(r as any).likes_count}</span>}
                </div>
                <a className="font-medium hover:underline" href={`/recipes/${r.id}`} target="_blank" rel="noreferrer">{r.title}</a>
                <div className="mt-2">
                  <button onClick={()=>deleteRecipe(r.id)} className="text-xs text-red-600 border rounded px-2 py-1">Удалить рецепт</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'favorites' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {(favorites || []).map((r: any) => (
            <div key={r.id} className="border rounded">
              {r.photo_path ? (
                <a href={`/recipes/${r.id}`} target="_blank" rel="noreferrer">
                  <img src={r.photo_path} className="w-full h-28 object-cover" />
                </a>
              ) : null}
              <div className="p-3">
                <div className="text-sm text-neutral-500 flex items-center justify-between">
                  <span>{r.topic}</span>
                  {typeof r.likes_count === 'number' && <span>❤ {r.likes_count}</span>}
                </div>
                <a className="font-medium hover:underline" href={`/recipes/${r.id}`} target="_blank" rel="noreferrer">{r.title}</a>
              </div>
            </div>
          ))}
          {favorites !== null && favorites.length === 0 && (
            <div className="text-sm text-neutral-500">Пока нет избранных рецептов</div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4 max-w-md">
          <div>
            <div className="text-sm text-neutral-600 mb-1">Отображаемое имя</div>
            {!isEditingNick ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-neutral-800">{me.nickname || 'без ника'}</div>
                <button type="button" className="text-xs px-2 py-1 border rounded" onClick={() => { setIsEditingNick(true); setNickname(me.nickname || '') }}>Изменить</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Никнейм" className="border rounded px-2 py-1 flex-1" />
                <button type="button" onClick={saveNickname} disabled={savingNick} className="px-3 py-1 rounded border disabled:opacity-60">{savingNick ? 'Сохранение…' : 'Сохранить'}</button>
                <button type="button" className="px-3 py-1 rounded border" onClick={() => { setIsEditingNick(false); setNickname(me.nickname || '') }}>Отмена</button>
              </div>
            )}
            {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
          </div>

          <div>
            <div className="text-sm text-neutral-600 mb-1">Аватар</div>
            <div className="flex items-center gap-3">
              <input id="avatar_input_settings" ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
              <label htmlFor="avatar_input_settings" className="inline-flex items-center px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-neutral-50 cursor-pointer">Загрузить новое фото</label>
              {me.photo_path && (
                <button type="button" className="text-sm text-red-600 underline" onClick={onDeletePhoto}>Удалить фото</button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-sm font-medium mb-2">Смена пароля</div>
            {!showPassForm ? (
              <button
                type="button"
                className="px-3 py-1 rounded border"
                onClick={() => { setShowPassForm(true); setPassMsg(null) }}
              >
                Изменить пароль
              </button>
            ) : (
              <div className="space-y-2">
                <input type="password" placeholder="Старый пароль" value={oldPass} onChange={e=>setOldPass(e.target.value)} className="border rounded px-2 py-1 w-full" />
                <input type="password" placeholder="Новый пароль" value={newPass1} onChange={e=>setNewPass1(e.target.value)} className="border rounded px-2 py-1 w-full" />
                <input type="password" placeholder="Повторите новый пароль" value={newPass2} onChange={e=>setNewPass2(e.target.value)} className="border rounded px-2 py-1 w-full" />
                {passMsg && <div className="text-xs text-red-600">{passMsg}</div>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded border"
                    onClick={async ()=>{
                      setPassMsg(null)
                      if (!oldPass || !newPass1 || !newPass2) { setPassMsg('Заполните все поля'); return }
                      if (newPass1 !== newPass2) { setPassMsg('Новые пароли не совпадают'); return }
                      try {
                        await api.post('/users/me/change-password', { old_password: oldPass, new_password: newPass1 })
                        setPassMsg('Пароль изменён')
                        setOldPass(''); setNewPass1(''); setNewPass2('')
                        setShowPassForm(false)
                      } catch (e:any) {
                        const msg = e?.response?.data?.detail || e?.message || 'Не удалось изменить пароль'
                        setPassMsg(String(msg))
                      }
                    }}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded border"
                    onClick={() => { setShowPassForm(false); setOldPass(''); setNewPass1(''); setNewPass2(''); setPassMsg(null) }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
