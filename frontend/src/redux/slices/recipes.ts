import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Recipe {
  id: number;
  title: string;
  topic: 'breakfast'|'lunch'|'dinner';
  photo_path?: string | null;
  // Optional fields returned by various endpoints
  description?: string;
  likes_count?: number;
  liked_by_me?: boolean | null;
  created_at?: string;
  ingredients?: { name: string; quantity: string }[];
  author?: { id: number; email: string; nickname?: string | null; photo_path?: string | null };
}
interface RecipesState { items: Recipe[]; popular: Recipe[] }

const initialState: RecipesState = { items: [], popular: [] }

const slice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<Recipe[]>) { state.items = action.payload },
    setPopular(state, action: PayloadAction<Recipe[]>) { state.popular = action.payload }
  }
})

export const { setItems, setPopular } = slice.actions
export default slice.reducer
