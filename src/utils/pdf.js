export function generateShiftTxt(shift, pricePerCubicMeter) {
  const totalSurtidores = shift.surtidores.reduce((sum, s) => {
    const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
    return sum + (vendido * pricePerCubicMeter)
  }, 0)

  const totalProductos = shift.ventas.reduce((sum, v) => sum + v.total, 0)
  const totalGeneral = totalSurtidores + totalProductos

  const content = `========================================
INFORME DE CIERRE DE TURNO
========================================

Fecha: ${shift.fecha}
Turno: ${shift.tipo.toUpperCase()}
Encargado: ${shift.encargado}

----------------------------------------
SURTIDORES
----------------------------------------
${shift.surtidores.map((s, i) => `
Surtidor ${i + 1}:
  Lectura Inicial: ${s.lecturaInicial || 0} m³
  Lectura Final: ${s.lecturaFinal || 0} m³
  Metros Vendidos: ${(((parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)).toFixed(2))} m³
  Total: $${((((parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)) * pricePerCubicMeter).toFixed(2))}
`).join('\n')}

Total Surtidores: $${totalSurtidores.toFixed(2)}

----------------------------------------
PRODUCTOS VENDIDOS
----------------------------------------
${shift.ventas.map(v => `
${v.nombre}:
  Cantidad: ${v.cantidad}
  Precio Unitario: $${v.precio}
  Total: $${v.total}
`).join('\n')}

Total Productos: $${totalProductos.toFixed(2)}

========================================
TOTAL GENERAL: $${totalGeneral.toFixed(2)}
========================================
`

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cierre_turno_${shift.fecha}_${shift.tipo}.txt`
  a.click()
}
