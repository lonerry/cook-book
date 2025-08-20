import { useState } from 'react'
import api from '../utils/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось отправить письмо')
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto space-y-3">
      <h1 className="text-2xl font-semibold">Сброс пароля</h1>
      {sent ? (
        <div className="text-sm text-neutral-600">Если такой email существует, мы отправили на него ссылку для сброса пароля.</div>
      ) : (
        <>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
          <button className="w-full bg-primary text-white rounded px-3 py-2">Отправить ссылку</button>
        </>
      )}
    </form>
  )
}
