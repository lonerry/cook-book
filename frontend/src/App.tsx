import React from 'react'
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from './components/Toaster'
import Home from './pages/Home'
import RecipeDetail from './pages/RecipeDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import CreateRecipe from './pages/CreateRecipe'
import Popular from './pages/Popular'
import ResetPassword from './pages/ResetPassword'
import ForgotPassword from './pages/ForgotPassword'
import RecipeEdit from './pages/RecipeEdit'
import UserPublic from './pages/UserPublic'
import { useAppSelector } from './hooks/useRedux'
import { useAppDispatch } from './hooks/useRedux'
import { logout as logoutAction, setUser } from './redux/slices/auth'
import api from './utils/api'

function Header() {
  const token = useAppSelector(s => s.auth.token)
  const user = useAppSelector(s => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const [search, setSearch] = React.useState('')
  React.useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || ''
    setSearch(q)
  }, [location.search])
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const logout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    dispatch(logoutAction())
    navigate('/login')
  }

  React.useEffect(() => {
    (async () => {
      try {
        if (token) {
          const res = await api.get('/users/me')
          dispatch(setUser(res.data))
        } else {
          dispatch(setUser(null))
        }
      } catch {
        // ignore
      }
    })()
  }, [token, dispatch])

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link to="/" className="font-bold text-lg text-primary">CookBook</Link>
        <nav className="flex gap-3 text-sm">
          <Link to="/" className={(location.pathname === '/' ? 'font-semibold underline text-neutral-900' : 'hover:text-primary')}>Лента</Link>
          <Link to="/popular" className={(location.pathname.startsWith('/popular') ? 'font-semibold underline text-neutral-900' : 'hover:text-primary')}>Популярное</Link>
        </nav>

        {/* Center search */}
        <form
          onSubmit={(e)=>{ e.preventDefault(); const q = search.trim(); const url = q ? `/?q=${encodeURIComponent(q)}` : '/'; if ((location.pathname+location.search) !== url) navigate(url); else navigate(url, { replace: true }); }}
          className="flex-1 hidden sm:flex justify-center"
        >
          <div className="relative w-full max-w-md">
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Поиск рецептов..."
              className="w-full border rounded-full pl-10 pr-3 py-2 text-sm bg-white/90"
            />
            <button type="submit" className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">🔍</button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-3">
          {token && (
            <Link to="/create" className="text-sm px-3 py-1 rounded bg-primary text-white">+ Добавить рецепт</Link>
          )}
          {!token ? (
            <div className="flex gap-3">
              <Link to="/login" className="px-3 py-1 rounded border">Войти</Link>
              <Link to="/register" className="px-3 py-1 rounded bg-primary text-white">Регистрация</Link>
            </div>
          ) : (
            <div ref={menuRef} className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(o=>!o)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-100"
              >
                {user?.photo_path ? (
                  <img src={user.photo_path} className="w-8 h-8 rounded-full object-cover"/>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs">
                    {(user?.nickname || user?.email || '?').slice(0,1).toUpperCase()}
                  </div>
                )}
                <span className="text-sm hidden sm:inline">{user?.nickname || user?.email || 'Профиль'}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border rounded shadow z-50">
                  <Link to="/profile" className="block px-3 py-2 text-sm hover:bg-neutral-50" onClick={()=>setMenuOpen(false)}>Мой профиль</Link>
                  <Link to="/profile?tab=settings" className="block px-3 py-2 text-sm hover:bg-neutral-50" onClick={()=>setMenuOpen(false)}>Настройки</Link>
                  <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-neutral-50" onClick={()=>{ setMenuOpen(false); logout() }}>Выйти</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/popular" element={<Popular />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/create" element={<CreateRecipe />} />
          <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
          <Route path="/users/:id" element={<UserPublic />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
