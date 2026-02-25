import React from 'react'

export default function SurtidorCard({ surtidor, index, onChange, pricePerCubicMeter }) {
  const vendido = (parseFloat(surtidor.lecturaFinal) || 0) - (parseFloat(surtidor.lecturaInicial) || 0)
  return (
    <div className="bg-white/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
      <h3 className="font-black text-xl mb-4 text-blue-600 dark:text-blue-400 italic">Surtidor {index + 1}</h3>
      <div className="space-y-4">
        <div className="relative">
          <input
            type="number"
            step="0.01"
            placeholder="Lectura Inicial (m³)"
            value={surtidor.lecturaInicial}
            onChange={e => onChange(index, 'lecturaInicial', e.target.value)}
            className="w-full px-4 py-3 bg-white/60 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
          />
        </div>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            placeholder="Lectura Final (m³)"
            value={surtidor.lecturaFinal}
            onChange={e => onChange(index, 'lecturaFinal', e.target.value)}
            className="w-full px-4 py-3 bg-white/60 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
          />
        </div>
        <div className="pt-4 border-t border-gray-100 dark:border-slate-700/50 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Despachado:</span>
            <span className="font-bold text-gray-700 dark:text-gray-200">{vendido.toFixed(2)} m³</span>
          </div>
          <div className="flex justify-between text-lg mt-1">
            <span className="text-blue-500 font-bold">Total:</span>
            <span className="font-black text-blue-600 dark:text-blue-400">
              ${(vendido * pricePerCubicMeter).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
