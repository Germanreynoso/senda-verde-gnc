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
      <input
        type="text"
        placeholder="Nombre"
        value={form.nombre}
        onChange={e => setForm({ ...form, nombre: e.target.value })}
        className="px-4 py-2 border rounded-lg"
      />
      <input
        type="text"
        placeholder="Apellido"
        value={form.apellido}
        onChange={e => setForm({ ...form, apellido: e.target.value })}
        className="px-4 py-2 border rounded-lg"
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
        className="px-4 py-2 border rounded-lg"
      />
      <div className="flex items-center gap-2">
        <select
          value={form.rol}
          onChange={e => setForm({ ...form, rol: e.target.value })}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="vendedor">Vendedor</option>
          <option value="administrador">Administrador</option>
        </select>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          {editingUser ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
