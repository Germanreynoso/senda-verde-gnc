import React, { useState } from 'react'
import { DataProvider, useData } from './context/DataContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UsersPage from './pages/UsersPage'
import ProductsPage from './pages/ProductsPage'
import ShiftPage from './pages/ShiftPage'
import Reports from './pages/Reports'
import './index.css'

function InnerApp() {
  const { currentUser, logout } = useData()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!currentUser) return <Login />

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        currentUser={currentUser}
        onLogout={logout}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
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
            {activeSection === 'dashboard' && <Dashboard />}
            {activeSection === 'users' && currentUser.rol === 'administrador' && <UsersPage />}
            {activeSection === 'products' && currentUser.rol === 'administrador' && <ProductsPage />}
            {activeSection === 'shift' && currentUser.rol === 'vendedor' && <ShiftPage />}
            {activeSection === 'reports' && <Reports />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <InnerApp />
    </DataProvider>
  )
}
