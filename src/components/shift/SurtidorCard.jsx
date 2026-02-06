import React from 'react'

export default function SurtidorCard({ surtidor, index, onChange, pricePerCubicMeter }) {
  const vendido = (parseFloat(surtidor.lecturaFinal) || 0) - (parseFloat(surtidor.lecturaInicial) || 0)
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-semibold mb-3">Surtidor {index + 1}</h3>
      <div className="space-y-2">
        <input
          type="number"
          step="0.01"
          placeholder="Lectura Inicial (m³)"
          value={surtidor.lecturaInicial}
          onChange={e => onChange(index, 'lecturaInicial', e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Lectura Final (m³)"
          value={surtidor.lecturaFinal}
          onChange={e => onChange(index, 'lecturaFinal', e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <div className="text-sm text-gray-600 mt-2">
          <p>Vendidos: {vendido.toFixed(2)} m³</p>
          <p className="font-semibold">Total: ${(vendido * pricePerCubicMeter).toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
