import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../utils/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [valid, setValid] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      if (!token) { setValid(false); return }
      try {
        const res = await api.get('/auth/reset-token/inspect', { params: { token } })
        setValid(res.data.valid)
      } catch { setValid(false) }
    })()
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 1200)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось сменить пароль')
    }
  }

  if (valid === null) return <div>Проверка токена…</div>
  if (!valid) return <div>Ссылка недействительна или устарела</div>
  if (done) return <div>Пароль обновлён. Перенаправление…</div>

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Новый пароль</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Новый пароль" className="w-full border rounded px-3 py-2" />
      <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Повторите пароль" className="w-full border rounded px-3 py-2" />
      <button className="w-full bg-primary text-white rounded px-3 py-2">Сохранить</button>
    </form>
  )
}
