import { useState } from 'react'
import api from '../utils/api'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [token, setToken] = useState<string | null>(null)

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/auth/register', { email, password })
    setSent(true)
  }

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await api.post('/auth/verify', { email, code })
    setToken(res.data.access_token)
  }

  if (!sent) {
    return (
      <form onSubmit={submitRegister} className="max-w-sm mx-auto space-y-3">
        <h1 className="text-2xl font-semibold">Регистрация</h1>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль" className="w-full border rounded px-3 py-2" />
        <button className="w-full bg-primary text-white rounded px-3 py-2">Отправить код</button>
      </form>
    )
  }

  return (
    <form onSubmit={submitVerify} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Подтверждение</h1>
      <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Код из письма" className="w-full border rounded px-3 py-2" />
      <button className="w-full bg-primary text-white rounded px-3 py-2">Подтвердить</button>
      {token && <div className="text-sm">Токен получен. Теперь войдите на странице входа.</div>}
    </form>
  )
}
