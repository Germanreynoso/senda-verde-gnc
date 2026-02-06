import React from 'react'
import { Users, Package, Fuel, ClipboardList, Eye, LogOut } from 'lucide-react'

export default function Sidebar({ activeSection, setActiveSection, currentUser, onLogout, setMobileMenuOpen }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <nav className="space-y-2">
        <button
          onClick={() => { setActiveSection('dashboard'); setMobileMenuOpen(false) }}
          className={`w-full text-left px-4 py-3 rounded flex items-center space-x-3 transition ${
            activeSection === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        {currentUser.rol === 'administrador' && (
          <>
            <button
              onClick={() => { setActiveSection('users'); setMobileMenuOpen(false) }}
              className={`w-full text-left px-4 py-3 rounded flex items-center space-x-3 transition ${
                activeSection === 'users' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Usuarios</span>
            </button>
            <button
              onClick={() => { setActiveSection('products'); setMobileMenuOpen(false) }}
              className={`w-full text-left px-4 py-3 rounded flex items-center space-x-3 transition ${
                activeSection === 'products' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>Productos</span>
            </button>
          </>
        )}

        {currentUser.rol === 'vendedor' && (
          <button
            onClick={() => { setActiveSection('shift'); setMobileMenuOpen(false) }}
            className={`w-full text-left px-4 py-3 rounded flex items-center space-x-3 transition ${
              activeSection === 'shift' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            <Fuel className="w-5 h-5" />
            <span>Gestión de Turno</span>
          </button>
        )}

        <button
          onClick={() => { setActiveSection('reports'); setMobileMenuOpen(false) }}
          className={`w-full text-left px-4 py-3 rounded flex items-center space-x-3 transition ${
            activeSection === 'reports' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          }`}
        >
          <Eye className="w-5 h-5" />
          <span>Historial</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full mt-4 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded hover:bg-red-700 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Salir</span>
        </button>
      </nav>
    </div>
  )
}
