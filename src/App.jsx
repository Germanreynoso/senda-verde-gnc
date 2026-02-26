import React, { useState, useEffect } from 'react'
import { DataProvider, useData } from './context/DataContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UsersPage from './pages/UsersPage'
import ProductsPage from './pages/ProductsPage'
import ShiftPage from './pages/ShiftPage'
import Reports from './pages/Reports'
import PageTransition from './components/PageTransition'
import { Toaster } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { Fuel } from 'lucide-react'
import './index.css'

function InnerApp() {
  const { currentUser, logout, loading } = useData()
  const [activeSection, setActiveSection] = useState(
    currentUser?.rol === 'administrador' ? 'dashboard' : 'shift'
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const hasUser = currentUser || !!localStorage.getItem('estacion-currentUser')

  if (loading && !hasUser) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <Fuel className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium animate-pulse">Cargando sistema...</p>
    </div>
  )

  if (!currentUser && !loading) return <Login />

  return (
    <div className="min-h-screen bg-transparent dark:bg-transparent">
      <Header
        currentUser={currentUser}
        onLogout={logout}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className={`lg:col-span-1 no-print ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <Sidebar
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              currentUser={currentUser}
              onLogout={logout}
              setMobileMenuOpen={setMobileMenuOpen}
            />
          </div>

          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <PageTransition key={activeSection}>
                {activeSection === 'dashboard' && currentUser.rol === 'administrador' && <Dashboard />}
                {activeSection === 'users' && currentUser.rol === 'administrador' && <UsersPage />}
                {activeSection === 'products' && currentUser.rol === 'administrador' && <ProductsPage />}
                {activeSection === 'shift' && currentUser.rol === 'vendedor' && <ShiftPage />}
                {activeSection === 'reports' && currentUser.rol === 'administrador' && <Reports />}
              </PageTransition>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <Toaster position="top-right" richColors />
      <InnerApp />
    </DataProvider>
  )
}
