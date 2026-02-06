import React, { useEffect, useState } from 'react'

export default function ProductForm({ onSave, editingProduct, clearEditing }) {
  const [form, setForm] = useState({ nombre: '', precio: '', stock: '', categoria: 'Lubricantes' })

  useEffect(() => {
    if (editingProduct) setForm(editingProduct)
  }, [editingProduct])

  const handleSave = () => {
    if (!form.nombre || form.precio === '' || form.stock === '')
      return alert('Complete todos los campos')
    onSave(form)
    setForm({ nombre: '', precio: '', stock: '', categoria: 'Lubricantes' })
    if (clearEditing) clearEditing()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <input
        value={form.nombre}
        onChange={e => setForm({ ...form, nombre: e.target.value })}
        placeholder="Nombre del producto"
        className="px-4 py-2 border rounded-lg"
      />
      <select
        value={form.categoria}
        onChange={e => setForm({ ...form, categoria: e.target.value })}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="Lubricantes">Lubricantes</option>
        <option value="Kiosco">Kiosco</option>
        <option value="Accesorios">Accesorios</option>
      </select>
      <input
        value={form.precio}
        onChange={e => setForm({ ...form, precio: e.target.value })}
        placeholder="Precio"
        type="number"
        className="px-4 py-2 border rounded-lg"
      />
      <div className="flex gap-2">
        <input
          value={form.stock}
          onChange={e => setForm({ ...form, stock: e.target.value })}
          placeholder="Stock"
          type="number"
          className="px-4 py-2 border rounded-lg w-full"
        />
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg whitespace-nowrap"
        >
          {editingProduct ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
