import React from 'react'
import { useData } from '../context/DataContext'

export default function Dashboard() {
  const { data } = useData()

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Resumen del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Usuarios</p>
            <p className="text-3xl font-bold text-blue-600">{data.users.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Productos</p>
            <p className="text-3xl font-bold text-green-600">{data.products.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Turnos Registrados</p>
            <p className="text-3xl font-bold text-purple-600">{data.shifts.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
