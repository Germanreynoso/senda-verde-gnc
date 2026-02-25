import React, { useState } from 'react'
import { Fuel } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function Login() {
  const { login } = useData()
  const [form, setForm] = useState({ nombre: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const user = await login(form.nombre, form.password)
    if (!user) return alert('Credenciales incorrectas')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse"></div>

      <div className="glass rounded-3xl shadow-2xl p-10 w-full max-w-md relative z-10 transition-all duration-500">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <Fuel className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Bienvenido</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Sistema de Gestión de Estación</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">Usuario</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-5 py-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
              placeholder="Tu nombre de usuario"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-5 py-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transform hover:-translate-y-1 active:scale-[0.98] transition-all duration-200"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Acceso de prueba</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-gray-600 dark:text-gray-400">
                <span className="block font-bold text-gray-900 dark:text-gray-200">Admin</span>
                <span className="text-xs opacity-75 italic">admin123</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="block font-bold text-gray-900 dark:text-gray-200">Vendedor</span>
                <span className="text-xs opacity-75 italic">vendedor123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
