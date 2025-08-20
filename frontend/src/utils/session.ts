const KEY = 'cookbook_token'
const EXP_KEY = 'cookbook_token_exp'

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (typeof payload?.exp === 'number') return payload.exp * 1000
    return null
  } catch { return null }
}

export function saveToken(token: string) {
  const expMs = decodeJwtExp(token)
  localStorage.setItem(KEY, token)
  if (expMs) localStorage.setItem(EXP_KEY, String(expMs))
}

export function loadToken(): string | null {
  const token = localStorage.getItem(KEY)
  const exp = Number(localStorage.getItem(EXP_KEY) || 0)
  if (!token) return null
  if (exp && Date.now() > exp) { clearToken(); return null }
  return token
}

export function clearToken() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(EXP_KEY)
}
