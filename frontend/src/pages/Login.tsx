import { useState } from 'react'
import api from '../utils/api'
import { useAppDispatch } from '../hooks/useRedux'
import { setToken } from '../redux/slices/auth'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await api.post('/auth/login-json', { email, password })
      dispatch(setToken(res.data.access_token))
      navigate('/profile')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Ошибка входа')
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Войти</h1>
      {error && <div className="text-red-600 text-sm">{String(error)}</div>}
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль" className="w-full border rounded px-3 py-2" />
      <button className="w-full bg-primary text-white rounded px-3 py-2">Войти</button>
      <div className="text-xs text-neutral-500 text-center">
        <Link to="/forgot" className="hover:underline">Забыли пароль?</Link>
      </div>
    </form>
  )
}
