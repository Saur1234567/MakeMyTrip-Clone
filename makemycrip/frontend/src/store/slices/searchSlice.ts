import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface SearchState {
  city: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  rooms: number
}

const initialState: SearchState = {
  city: '',
  checkIn: '',
  checkOut: '',
  adults: 1,
  children: 0,
  rooms: 1,
}

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearch: (state, action: PayloadAction<Partial<SearchState>>) => {
      return { ...state, ...action.payload }
    },
    resetSearch: () => initialState,
  },
})

export const { setSearch, resetSearch } = searchSlice.actions
export default searchSlice.reducer
