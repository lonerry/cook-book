import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { loadToken, saveToken, clearToken } from '../../utils/session'

interface User { id: number; email: string; nickname?: string | null; full_name?: string | null; photo_path?: string | null }
interface AuthState { token: string | null; user: User | null }

const initialState: AuthState = { token: loadToken(), user: null }

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload
      if (action.payload) saveToken(action.payload); else clearToken()
    },
    setUser(state, action: PayloadAction<User | null>) { state.user = action.payload },
    logout(state) { state.token = null; state.user = null; clearToken() }
  }
})

export const { setToken, setUser, logout } = slice.actions
export default slice.reducer
