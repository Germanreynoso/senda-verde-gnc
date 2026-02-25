import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import { Download, Search, Calendar, Filter } from 'lucide-react'
import { generateShiftExcel } from '../utils/excel'
import { formatDate } from '../utils/format'

export default function Reports() {
  const { data } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const filteredShifts = data.shifts
    .filter(shift => {
      const matchSearch = shift.encargado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.tipo.toLowerCase().includes(searchTerm.toLowerCase())
      const matchDate = !dateFilter || shift.fecha === dateFilter
      return matchSearch && matchDate
    })
    .slice()
    .reverse()

  return (
    <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Historial de Turnos</h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto no-print">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por encargado o turno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64 transition-all"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full transition-all"
            />
          </div>
        </div>
      </div>

      {filteredShifts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50/50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-700">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron turnos con esos filtros</p>
          <button
            onClick={() => { setSearchTerm(''); setDateFilter('') }}
            className="mt-4 text-blue-600 font-bold hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredShifts.map(shift => {
            const totalSurt = shift.surtidores.reduce((sum, s) => {
              const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
              return sum + (vendido * data.pricePerCubicMeter)
            }, 0)
            const totalProd = shift.ventas.reduce((sum, v) => sum + v.total, 0)

            return (
              <div key={shift.id} className="bg-white/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-6 hover:shadow-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 italic">
                      Turno {shift.tipo.toUpperCase()}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(shift.fecha)} • {shift.encargado}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${shift.estado === 'abierto'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/20'
                        }`}
                    >
                      {shift.estado}
                    </span>
                    <button
                      onClick={() => generateShiftExcel(shift, data.pricePerCubicMeter)}
                      className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 no-print shadow-sm"
                      title="Descargar Excel"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100 dark:border-slate-700/50">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Surtidores</p>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300">${totalSurt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Productos</p>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300">${totalProd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-400 dark:text-blue-500 uppercase tracking-widest">Total</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">${(totalSurt + totalProd).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
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
