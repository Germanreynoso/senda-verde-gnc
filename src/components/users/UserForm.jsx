import React, { useEffect, useState } from 'react'

export default function UserForm({ onSave, editingUser, clearEditing }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', password: '', rol: 'vendedor' })

  useEffect(() => {
    if (editingUser) setForm(editingUser)
  }, [editingUser])

  const handleSave = () => {
    if (!form.nombre || !form.apellido || !form.password)
      return alert('Complete todos los campos')
    onSave(form)
    setForm({ nombre: '', apellido: '', password: '', rol: 'vendedor' })
    if (clearEditing) clearEditing()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre</label>
        <input
          type="text"
          placeholder="Ej: Juan"
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Apellido</label>
        <input
          type="text"
          placeholder="Ej: Pérez"
          value={form.apellido}
          onChange={e => setForm({ ...form, apellido: e.target.value })}
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
        <input
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Rol y Acción</label>
        <div className="flex items-center gap-2">
          <select
            value={form.rol}
            onChange={e => setForm({ ...form, rol: e.target.value })}
            className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
          >
            <option value="vendedor">Vendedor</option>
            <option value="administrador">Administrador</option>
          </select>
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            {editingUser ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
