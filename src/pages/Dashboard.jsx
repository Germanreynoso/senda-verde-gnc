import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import SalesChart from '../components/Dashboard/SalesChart'
import { motion } from 'framer-motion'
import { Search, Fuel, Package, Landmark } from 'lucide-react'
import { getTodayDate, formatDate } from '../utils/format'

export default function Dashboard() {
  const { data } = useData()
  const [query, setQuery] = useState({
    fecha: getTodayDate(),
    tipo: 'mañana'
  })

  const selectedShift = data.shifts.find(s => s.fecha === query.fecha && s.tipo === query.tipo)

  const calcShiftTotals = (shift) => {
    if (!shift) return null
    const totalSurtData = (shift.surtidores || []).reduce((sum, s) => {
      const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
      return sum + vendido * data.pricePerCubicMeter
    }, 0)
    const totalProdData = (shift.ventas || []).reduce((sum, v) => sum + v.total, 0)
    return { surt: totalSurtData, prod: totalProdData, total: totalSurtData + totalProdData }
  }

  const shiftTotals = calcShiftTotals(selectedShift)

  const stats = [
    { label: 'Total Usuarios', value: (data.users || []).length, color: 'blue' },
    { label: 'Total Productos', value: (data.products || []).length, color: 'emerald' },
    { label: 'Turnos Registrados', value: (data.shifts || []).length, color: 'violet' },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 tracking-tight">Resumen del Sistema</h2>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              variants={item}
              className={`bg-${stat.color}-500/10 dark:bg-${stat.color}-500/20 p-6 rounded-2xl border border-${stat.color}-200/50 dark:border-${stat.color}-500/20 backdrop-blur-sm transition-transform hover:scale-105 cursor-default`}
            >
              <p className={`text-sm font-medium text-${stat.color}-600 dark:text-${stat.color}-400 uppercase tracking-wider`}>{stat.label}</p>
              <p className={`text-4xl font-bold text-${stat.color}-700 dark:text-${stat.color}-300 mt-2`}>{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Sección de Consulta Rápida */}
        <div className="mt-12 p-6 bg-white/30 dark:bg-slate-800/30 rounded-3xl border border-gray-100 dark:border-slate-700/50 shadow-sm transition-all duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                <Search className="w-5 h-5 mr-2 text-blue-500" />
                Consulta de Ventas por Turno
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Seleccione una fecha y turno para ver los totales</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="date"
                value={query.fecha}
                onChange={e => setQuery({ ...query, fecha: e.target.value })}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={query.tipo}
                onChange={e => setQuery({ ...query, tipo: e.target.value })}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
              </select>
            </div>
          </div>

          {shiftTotals ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center space-x-4">
                <div className="p-3 bg-blue-500/10 rounded-xl"><Fuel className="w-6 h-6 text-blue-500" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gas Natural</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">${shiftTotals.surt.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl"><Package className="w-6 h-6 text-emerald-500" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shop / Otros</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">${shiftTotals.prod.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-4 bg-blue-600 rounded-2xl flex items-center space-x-4 text-white shadow-lg shadow-blue-500/20">
                <div className="p-3 bg-white/20 rounded-xl"><Landmark className="w-6 h-6 text-white" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total del Turno</p>
                  <p className="text-2xl font-black">${shiftTotals.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center bg-gray-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-700">
              <p className="text-gray-500 dark:text-gray-400 italic">No hay registros para el turno seleccionado ({formatDate(query.fecha)} - {query.tipo})</p>
            </div>
          )}
        </div>

        <SalesChart shifts={data.shifts} pricePerCubicMeter={data.pricePerCubicMeter} />
      </div>
    </div>
  )
}
