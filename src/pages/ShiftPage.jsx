import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import SurtidorCard from '../components/shift/SurtidorCard'
import { Download, Plus } from 'lucide-react'
import { generateShiftTxt } from '../utils/pdf'

export default function ShiftPage() {
  const { data, currentUser, addShift, decreaseProductStock, updateShift } = useData()
  const [activeShift, setActiveShift] = useState(null)
  const [shiftForm, setShiftForm] = useState({
    tipo: 'mañana',
    fecha: new Date().toISOString().split('T')[0],
    surtidores: [
      { id: 1, lecturaInicial: '', lecturaFinal: '' },
      { id: 2, lecturaInicial: '', lecturaFinal: '' },
      { id: 3, lecturaInicial: '', lecturaFinal: '' },
      { id: 4, lecturaInicial: '', lecturaFinal: '' }
    ],
    ventas: []
  })

  const [productSaleForm, setProductSaleForm] = useState({ productId: '', cantidad: '' })

  const handleOpenShift = async () => {
    if (activeShift) return alert('Ya hay un turno abierto')
    const newShiftData = {
      ...shiftForm,
      encargado: `${currentUser.nombre} ${currentUser.apellido}`,
      estado: 'abierto',
      fechaApertura: new Date().toISOString()
    }
    const savedShift = await addShift(newShiftData)
    if (savedShift) {
      setActiveShift(savedShift)
      alert('Turno abierto exitosamente')
    } else {
      alert('Error al abrir el turno')
    }
  }

  const handleUpdateSurtidor = (index, field, value) => {
    const newS = [...shiftForm.surtidores]
    newS[index][field] = value
    setShiftForm({ ...shiftForm, surtidores: newS })
  }

  const handleAddProductSale = () => {
    if (!productSaleForm.productId || !productSaleForm.cantidad)
      return alert('Seleccione un producto y cantidad')

    const product = data.products.find(p => p.id === parseInt(productSaleForm.productId))
    const cantidad = parseInt(productSaleForm.cantidad)
    if (cantidad > product.stock) return alert('Stock insuficiente')

    const venta = {
      id: Date.now(),
      productId: product.id,
      nombre: product.nombre,
      precio: product.precio,
      cantidad,
      total: product.precio * cantidad
    }

    setShiftForm(prev => ({ ...prev, ventas: [...prev.ventas, venta] }))
    decreaseProductStock(product.id, cantidad)
    setProductSaleForm({ productId: '', cantidad: '' })
  }

  const calculateTotals = () => {
    const totalSurtidores = shiftForm.surtidores.reduce((sum, s) => {
      const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
      return sum + (vendido * data.pricePerCubicMeter)
    }, 0)

    const totalProductos = shiftForm.ventas.reduce((sum, v) => sum + v.total, 0)
    return { surtidores: totalSurtidores, productos: totalProductos, total: totalSurtidores + totalProductos }
  }

  const handleCloseShift = async () => {
    if (!confirm('¿Está seguro de cerrar el turno?')) return
    const updatedShift = {
      ...activeShift,
      surtidores: shiftForm.surtidores,
      ventas: shiftForm.ventas,
      estado: 'cerrado',
      fechaCierre: new Date().toISOString()
    }
    await updateShift(updatedShift)
    generateShiftTxt(updatedShift, data.pricePerCubicMeter)
    setActiveShift(null)
    setShiftForm({
      tipo: 'mañana',
      fecha: new Date().toISOString().split('T')[0],
      surtidores: [
        { id: 1, lecturaInicial: '', lecturaFinal: '' },
        { id: 2, lecturaInicial: '', lecturaFinal: '' },
        { id: 3, lecturaInicial: '', lecturaFinal: '' },
        { id: 4, lecturaInicial: '', lecturaFinal: '' }
      ],
      ventas: []
    })
    alert('Turno cerrado exitosamente')
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {!activeShift ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Abrir Turno</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Turno</label>
              <select
                value={shiftForm.tipo}
                onChange={e => setShiftForm({ ...shiftForm, tipo: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha</label>
              <input
                type="date"
                value={shiftForm.fecha}
                onChange={e => setShiftForm({ ...shiftForm, fecha: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={handleOpenShift}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Abrir Turno
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestión de Surtidores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shiftForm.surtidores.map((s, i) => (
                <SurtidorCard
                  key={s.id}
                  surtidor={s}
                  index={i}
                  onChange={handleUpdateSurtidor}
                  pricePerCubicMeter={data.pricePerCubicMeter}
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Ventas de Productos</h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={productSaleForm.productId}
                  onChange={e => setProductSaleForm({ ...productSaleForm, productId: e.target.value })}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar Producto</option>
                  {data.products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.categoria || 'Gral'}) - Stock: {p.stock}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={productSaleForm.cantidad}
                  onChange={e => setProductSaleForm({ ...productSaleForm, cantidad: e.target.value })}
                  className="px-4 py-2 border rounded-lg"
                />
                <button
                  onClick={handleAddProductSale}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

            {shiftForm.ventas.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Producto</th>
                      <th className="px-4 py-2 text-left">Cantidad</th>
                      <th className="px-4 py-2 text-left">Precio Unit.</th>
                      <th className="px-4 py-2 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftForm.ventas.map(v => (
                      <tr key={v.id} className="border-b">
                        <td className="px-4 py-3">{v.nombre}</td>
                        <td className="px-4 py-3">{v.cantidad}</td>
                        <td className="px-4 py-3">${v.precio.toFixed(2)}</td>
                        <td className="px-4 py-3 font-semibold">${v.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Resumen del Turno</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Surtidores</p>
                <p className="text-2xl font-bold text-blue-600">${totals.surtidores.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-green-600">${totals.productos.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total General</p>
                <p className="text-2xl font-bold text-purple-600">${totals.total.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={handleCloseShift}
              className="mt-4 w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Cerrar Turno y Generar TXT</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
