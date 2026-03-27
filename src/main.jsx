import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import useThemeStore from './store/themeStore'
import ErrorBoundary from './components/common/ErrorBoundary'

// Init theme before render
const storedTheme = JSON.parse(localStorage.getItem('admin-theme') || '{}')?.state?.theme || 'dark'
document.documentElement.className = storedTheme

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          className: '',
          style: {
            background: 'rgb(var(--bg-card, 24 24 36))',
            color: 'rgb(var(--text-primary, 248 248 255))',
            border: '1px solid rgba(var(--border, 255 255 255 / 0.07))',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: '"DM Sans", sans-serif',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
