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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Producto</label>
        <input
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          placeholder="Nombre del producto"
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Categoría</label>
        <select
          value={form.categoria}
          onChange={e => setForm({ ...form, categoria: e.target.value })}
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
        >
          <option value="Lubricantes">Lubricantes</option>
          <option value="Kiosco">Kiosco</option>
          <option value="Accesorios">Accesorios</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Precio</label>
        <input
          value={form.precio}
          onChange={e => setForm({ ...form, precio: e.target.value })}
          placeholder="0.00"
          type="number"
          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
        />
      </div>
      <div className="flex flex-col space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Stock y Acción</label>
        <div className="flex gap-2">
          <input
            value={form.stock}
            onChange={e => setForm({ ...form, stock: e.target.value })}
            placeholder="0"
            type="number"
            className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
          />
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            {editingProduct ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
