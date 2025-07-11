// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import './App.css'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { Toaster } from 'react-hot-toast'

// React Query imports
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a client
const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Supabase auth context */}
      <AuthProvider>
        {/* React Query context */}
        <QueryClientProvider client={queryClient}>
          {/* Your routes and pages */}
          <App />
          {/* Toast notifications */}
          <Toaster position="top-right" />
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
