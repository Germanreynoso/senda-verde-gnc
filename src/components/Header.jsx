import React from 'react'
import { Fuel, LogOut, Menu, X, Sun, Moon, Search } from 'lucide-react'

export default function Header({ currentUser, onLogout, mobileMenuOpen, setMobileMenuOpen, theme, toggleTheme }) {
  return (
    <header className="bg-blue-600 dark:bg-slate-900 text-white shadow-lg sticky top-0 z-50 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Fuel className="w-8 h-8 text-blue-200 dark:text-blue-400" />
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold tracking-tight">GNC Gestión</h1>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300 group-focus-within:text-white w-4 h-4 transition-colors" />
            <input
              type="text"
              placeholder="Búsqueda rápida..."
              className="w-full bg-blue-700/50 dark:bg-slate-800/50 border border-blue-500/30 dark:border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-sm placeholder-blue-300 dark:placeholder-slate-500 focus:ring-2 focus:ring-white/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-right mr-4 hidden lg:block">
            <p className="text-sm font-bold leading-tight">{currentUser?.nombre} {currentUser?.apellido}</p>
            <p className="text-[10px] text-blue-200 dark:text-slate-500 uppercase tracking-widest">{currentUser?.rol}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-blue-700 dark:hover:bg-slate-800 transition-all duration-300"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>

          <button
            onClick={onLogout}
            className="hidden lg:flex items-center space-x-2 bg-blue-700 dark:bg-slate-800 px-4 py-2 rounded-lg hover:bg-blue-800 dark:hover:bg-slate-700 transition shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
