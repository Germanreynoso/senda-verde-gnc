import React from 'react'
import { useData } from '../context/DataContext'
import { Download } from 'lucide-react'
import { generateShiftExcel } from '../utils/excel'
import { formatDate } from '../utils/format'

export default function Reports() {
  const { data } = useData()

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Historial de Turnos</h2>
      {data.shifts.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No hay turnos registrados</p>
      ) : (
        <div className="space-y-4">
          {data.shifts.slice().reverse().map(shift => {
            const totalSurt = shift.surtidores.reduce((sum, s) => {
              const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
              return sum + (vendido * data.pricePerCubicMeter)
            }, 0)
            const totalProd = shift.ventas.reduce((sum, v) => sum + v.total, 0)

            return (
              <div key={shift.id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">Turno {shift.tipo.toUpperCase()} - {formatDate(shift.fecha)}</h3>
                    <p className="text-sm text-gray-600">Encargado: {shift.encargado}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${shift.estado === 'abierto'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      {shift.estado}
                    </span>
                    <button
                      onClick={() => generateShiftExcel(shift, data.pricePerCubicMeter)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition no-print"
                      title="Descargar Excel"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Surtidores</p>
                    <p className="font-semibold">${totalSurt.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Productos</p>
                    <p className="font-semibold">${totalProd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-bold text-lg">${(totalSurt + totalProd).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
