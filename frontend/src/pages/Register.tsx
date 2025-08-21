import { useState } from 'react'
import api from '../utils/api'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/auth/register', { email, password })
      setSent(true)
    } catch (e: any) {
      console.log('Register error:', e?.response?.data)
      const d = e?.response?.data?.detail
      const code = d?.code
      if (code === 'EMAIL_EXISTS') {
        setError('Этот email уже зарегистрирован. Пожалуйста, войдите.')
      } else {
        const msg = typeof d === 'string' ? d : (d?.message || 'Не удалось отправить код')
        setError(msg)
      }
    }
  }

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/auth/verify', { email, code })
      navigate('/login')
    } catch (e: any) {
      const d = e?.response?.data?.detail
      const msg = typeof d === 'string' ? d : (d?.message || 'Неверный или просроченный код')
      setError(msg)
    }
  }

  if (!sent) {
    return (
      <form onSubmit={submitRegister} className="max-w-sm mx-auto space-y-3">
        <h1 className="text-2xl font-semibold">Регистрация</h1>
        {error && (
          <div className="text-red-600 text-sm">
            {error}
            {error === 'Этот email уже зарегистрирован. Пожалуйста, войдите.' && (
              <> <a href="/login" className="underline">Войти</a></>
            )}
          </div>
        )}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Пароль" className="w-full border rounded px-3 py-2" />
        <button className="w-full bg-primary text-white rounded px-3 py-2">Отправить код</button>
        <div className="text-xs text-neutral-500 text-center">
          Уже есть аккаунт? <a href="/login" className="hover:underline">Войти</a>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={submitVerify} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Подтверждение</h1>
      {error && <div className="text-red-600 text-sm">{String(error)}</div>}
      <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Код из письма" className="w-full border rounded px-3 py-2" />
      <button className="w-full bg-primary text-white rounded px-3 py-2">Подтвердить</button>
    </form>
  )
}
