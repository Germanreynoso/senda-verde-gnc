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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Fuel className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Sistema de Gestión</h1>
          <p className="text-gray-600">Estación de Servicio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600 bg-gray-50 p-4 rounded">
          <p className="font-semibold mb-2">Usuarios de prueba:</p>
          <p>Admin: <strong>Admin</strong> / <em>admin123</em></p>
          <p>Vendedor: <strong>Juan</strong> / <em>vendedor123</em></p>
        </div>
      </div>
    </div>
  )
}
