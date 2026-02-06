import React from 'react'
import { Fuel, LogOut, Menu, X } from 'lucide-react'

export default function Header({ currentUser, onLogout, mobileMenuOpen, setMobileMenuOpen }) {
  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Fuel className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">Sistema de Gestión</h1>
            <p className="text-sm text-blue-200">
              {currentUser?.nombre} {currentUser?.apellido} - {currentUser?.rol}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
          <button
            onClick={onLogout}
            className="hidden lg:flex items-center space-x-2 bg-blue-700 px-4 py-2 rounded hover:bg-blue-800 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
