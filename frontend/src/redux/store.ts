import { configureStore } from '@reduxjs/toolkit'
import auth from './slices/auth'
import recipes from './slices/recipes'

export const store = configureStore({
  reducer: { auth, recipes }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
