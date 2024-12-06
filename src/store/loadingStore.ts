import { create } from 'zustand'

interface LoadingState {
  isLoading: boolean
  progress: number
  setLoading: (loading: boolean) => void
  setProgress: (progress: number) => void
  reset: () => void
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  progress: 0,
  setLoading: (loading) => set({ isLoading: loading }),
  setProgress: (progress) => set({ progress: Math.min(Math.max(progress, 0), 100) }),
  reset: () => set({ isLoading: false, progress: 0 })
}))
