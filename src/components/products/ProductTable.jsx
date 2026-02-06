import React from 'react'
import { Edit2, Trash2 } from 'lucide-react'

export default function ProductTable({ products, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Producto</th>
            <th className="px-4 py-2 text-left">Categoría</th>
            <th className="px-4 py-2 text-left">Precio</th>
            <th className="px-4 py-2 text-left">Stock</th>
            <th className="px-4 py-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">{product.nombre}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs ${product.categoria === 'Kiosco' ? 'bg-purple-100 text-purple-800' :
                    product.categoria === 'Lubricantes' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                  }`}>
                  {product.categoria || 'Lubricantes'}
                </span>
              </td>
              <td className="px-4 py-3">${product.precio.toFixed(2)}</td>
              <td className="px-4 py-3">{product.stock} unidades</td>
              <td className="px-4 py-3">
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => onEdit(product)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar producto?')) onDelete(product.id) }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
