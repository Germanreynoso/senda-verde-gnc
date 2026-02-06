import React from 'react'
import { Edit2, Trash2 } from 'lucide-react'

export default function UserTable({ users, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Nombre</th>
            <th className="px-4 py-2 text-left">Apellido</th>
            <th className="px-4 py-2 text-left">Rol</th>
            <th className="px-4 py-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">{user.nombre}</td>
              <td className="px-4 py-3">{user.apellido}</td>
              <td className="px-4 py-3">{user.rol}</td>
              <td className="px-4 py-3">
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar usuario?')) onDelete(user.id) }}
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
