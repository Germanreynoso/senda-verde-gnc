import React from 'react'
import { Users, Package, Fuel, ClipboardList, Eye, LogOut } from 'lucide-react'

export default function Sidebar({ activeSection, setActiveSection, currentUser, onLogout, setMobileMenuOpen }) {
  return (
    <div className="glass rounded-2xl shadow-xl p-4 transition-all duration-300">
      <nav className="space-y-1">
        <button
          onClick={() => { setActiveSection('dashboard'); setMobileMenuOpen(false) }}
          className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${activeSection === 'dashboard'
            ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]'
            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5'
            }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </button>

        {currentUser.rol === 'administrador' && (
          <>
            <button
              onClick={() => { setActiveSection('users'); setMobileMenuOpen(false) }}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${activeSection === 'users'
                ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Usuarios</span>
            </button>
            <button
              onClick={() => { setActiveSection('products'); setMobileMenuOpen(false) }}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${activeSection === 'products'
                ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
            >
              <Package className="w-5 h-5" />
              <span className="font-medium">Productos</span>
            </button>
          </>
        )}

        {currentUser.rol === 'vendedor' && (
          <button
            onClick={() => { setActiveSection('shift'); setMobileMenuOpen(false) }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${activeSection === 'shift'
              ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]'
              : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5'
              }`}
          >
            <Fuel className="w-5 h-5" />
            <span className="font-medium">Gestión de Turno</span>
          </button>
        )}

        <button
          onClick={() => { setActiveSection('reports'); setMobileMenuOpen(false) }}
          className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${activeSection === 'reports'
            ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]'
            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5'
            }`}
        >
          <Eye className="w-5 h-5" />
          <span className="font-medium">Historial</span>
        </button>

        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>

        <div className="mt-8 flex justify-center">
          <img
            src="/jesus-baila.gif"
            alt="Jesus Bailando"
            className="w-full max-w-[200px] h-auto rounded-xl shadow-lg opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
      </nav>
    </div>
  )
}
