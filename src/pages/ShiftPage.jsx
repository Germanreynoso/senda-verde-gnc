import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import SurtidorCard from '../components/shift/SurtidorCard'
import { Printer, Download, Plus, Trash2, X } from 'lucide-react'
import { generateShiftExcel } from '../utils/excel'
import { formatDate } from '../utils/format'
import { supabase } from '../lib/supabase'

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
    ventas: [],
    depositos: []
  })

  const [productSaleForm, setProductSaleForm] = useState({ productId: '', cantidad: '' })
  const [productSearch, setProductSearch] = useState('')
  const [depositForm, setDepositForm] = useState({ monto: '', nota: '', numeroSobre: '' })
  const [hasPrinted, setHasPrinted] = useState(false)

  const handleOpenShift = async () => {
    if (activeShift) return
    setHasPrinted(false)
    const newShiftData = {
      ...shiftForm,
      encargado: `${currentUser.nombre} ${currentUser.apellido}`,
      estado: 'abierto',
      fechaApertura: new Date().toISOString()
    }
    const savedShift = await addShift(newShiftData)
    if (savedShift) {
      setActiveShift(savedShift)
    } else {
      console.error('Error al abrir el turno')
    }
  }

  const handleUpdateSurtidor = (index, field, value) => {
    const newS = [...shiftForm.surtidores]
    newS[index][field] = value
    setShiftForm({ ...shiftForm, surtidores: newS })
  }

  const handleAddProductSale = () => {
    if (!productSaleForm.productId || !productSaleForm.cantidad)
      return

    const product = data.products.find(p => p.id === parseInt(productSaleForm.productId))
    const cantidad = parseInt(productSaleForm.cantidad)
    if (cantidad > product.stock) return

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
    setProductSearch('')
  }

  const handleAddDeposit = () => {
    if (!depositForm.monto || parseFloat(depositForm.monto) <= 0) return
    if (!depositForm.numeroSobre) return

    const nuevoDeposito = {
      id: Date.now(),
      numeroSobre: depositForm.numeroSobre,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      monto: parseFloat(depositForm.monto),
      nota: depositForm.nota
    }
    setShiftForm(prev => ({ ...prev, depositos: [...prev.depositos, nuevoDeposito] }))
    // Sugerimos el siguiente número de sobre si es numérico
    const nextSobre = !isNaN(depositForm.numeroSobre) ? (parseInt(depositForm.numeroSobre) + 1).toString() : ''
    setDepositForm({ monto: '', nota: '', numeroSobre: nextSobre })
  }

  const handleDeleteDeposit = (id) => {
    setShiftForm(prev => ({ ...prev, depositos: prev.depositos.filter(d => d.id !== id) }))
  }

  const calculateTotals = () => {
    const totalSurtidores = shiftForm.surtidores.reduce((sum, s) => {
      const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
      return sum + (vendido * data.pricePerCubicMeter)
    }, 0)

    const totalProductos = shiftForm.ventas.reduce((sum, v) => sum + v.total, 0)
    const totalDepositos = shiftForm.depositos.reduce((sum, d) => sum + d.monto, 0)
    const totalGeneral = totalSurtidores + totalProductos
    const diferencia = totalDepositos - totalGeneral
    return {
      surtidores: totalSurtidores,
      productos: totalProductos,
      depositos: totalDepositos,
      total: totalGeneral,
      diferencia: diferencia,
      estaCuadrado: Math.abs(diferencia) < 0.01
    }
  }

  const handleCloseShift = async () => {
    const totals = calculateTotals()
    if (!totals.estaCuadrado) {
      alert(`No se puede cerrar el turno. El arqueo no coincide.\nDiferencia: $${totals.diferencia.toFixed(2)}`)
      return
    }

    if (!confirm('¿Está seguro de cerrar el turno?')) return
    const updatedShift = {
      ...activeShift,
      surtidores: shiftForm.surtidores,
      ventas: shiftForm.ventas,
      estado: 'cerrado',
      fechaCierre: new Date().toISOString()
    }
    await updateShift(updatedShift)

    // Enviar reporte por mail
    try {
      await supabase.functions.invoke('send-shift-report', {
        body: {
          shift: updatedShift,
          totals: totals,
          recipient: 'chombyferrari37.37.37@gmail.com'
        }
      });
      alert('Reporte enviado con éxito al correo chombyferrari37.37.37@gmail.com');
    } catch (error) {
      console.error('Error enviando mail:', error)
      alert('El turno se cerró pero hubo un error enviando el mail.');
    }

    generateShiftExcel(updatedShift, data.pricePerCubicMeter)
    setActiveShift(null)
    setHasPrinted(false)
    setShiftForm({
      tipo: 'mañana',
      fecha: new Date().toISOString().split('T')[0],
      surtidores: [
        { id: 1, lecturaInicial: '', lecturaFinal: '' },
        { id: 2, lecturaInicial: '', lecturaFinal: '' },
        { id: 3, lecturaInicial: '', lecturaFinal: '' },
        { id: 4, lecturaInicial: '', lecturaFinal: '' }
      ],
      ventas: [],
      depositos: []
    })
  }

  const handlePrint = () => {
    window.print()
    setHasPrinted(true)
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
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold no-print"
            >
              Abrir Turno
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Turno {activeShift.tipo.toUpperCase()}
                </h2>
                <p className="text-gray-600">
                  {formatDate(activeShift.fecha)} | Operator: {activeShift.encargado}
                </p>
              </div>
              <div className="text-right no-print">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold uppercase">
                  {activeShift.estado}
                </span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Gestión de Surtidores</h2>
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

            <div className="mb-4 p-4 bg-gray-50 rounded-lg no-print">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative flex flex-col">
                  <input
                    type="text"
                    placeholder="Escriba para buscar producto..."
                    value={productSearch}
                    onChange={e => {
                      setProductSearch(e.target.value)
                      setProductSaleForm({ ...productSaleForm, productId: '' })
                    }}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
                  />

                  {productSearch && (
                    <div className="absolute z-10 w-full mt-11 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {data.products
                        .filter(p => p.nombre.toLowerCase().startsWith(productSearch.toLowerCase()))
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setProductSaleForm({ ...productSaleForm, productId: p.id.toString() })
                              setProductSearch(p.nombre)
                            }}
                            className={`px-4 py-3 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 flex justify-between items-center ${productSaleForm.productId === p.id.toString() ? 'bg-blue-100' : ''
                              }`}
                          >
                            <span className="font-medium text-gray-800">{p.nombre}</span>
                            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">
                              Stock: {p.stock}
                            </span>
                          </div>
                        ))}
                      {data.products.filter(p => p.nombre.toLowerCase().startsWith(productSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-gray-500 text-sm">No se encontraron productos</div>
                      )}
                    </div>
                  )}
                </div>
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

          {/* Sección de Depósitos */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Control de Depósitos (Sobres Numerados)</h2>
              <div className="flex space-x-2">
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                  Suma Sobres: ${totals.depositos.toFixed(2)}
                </div>
                <div className={`${totals.estaCuadrado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} px-3 py-1 rounded-full text-sm font-bold`}>
                  Balance: ${totals.diferencia.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
              <input
                type="text"
                placeholder="N° de Sobre"
                value={depositForm.numeroSobre}
                onChange={e => setDepositForm({ ...depositForm, numeroSobre: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
              />
              <input
                type="number"
                placeholder="Monto ($)"
                value={depositForm.monto}
                onChange={e => setDepositForm({ ...depositForm, monto: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
              />
              <input
                type="text"
                placeholder="Nota (opcional)"
                value={depositForm.nota}
                onChange={e => setDepositForm({ ...depositForm, nota: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none border-dashed"
              />
              <button
                onClick={handleAddDeposit}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 font-semibold transition flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrar Sobre
              </button>
            </div>

            {shiftForm.depositos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {shiftForm.depositos.map(d => (
                  <div key={d.id} className="group bg-gray-50 border-2 border-yellow-200 rounded-lg p-3 flex flex-col relative overflow-hidden transition hover:border-yellow-400">
                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase">
                      Sobre N°{d.numeroSobre}
                    </div>

                    {/* Botón de eliminar sobre - Solo visible al pasar el mouse (hover) o en táctil */}
                    <button
                      onClick={() => handleDeleteDeposit(d.id)}
                      className="absolute top-1 left-1 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 no-print"
                      title="Eliminar sobre"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    <div className="text-xl font-bold text-gray-800 mt-2">${d.monto.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                      <span>{d.hora} hs</span>
                      <span className="truncate max-w-[100px]">{d.nota}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 italic">No se han registrado sobres en este turno</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Conciliación Final de Turno</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Ventas (A)</p>
                <p className="text-2xl font-bold text-blue-600">${totals.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total en Sobres (B)</p>
                <p className="text-2xl font-bold text-yellow-600">${totals.depositos.toFixed(2)}</p>
              </div>
              <div className={`p-2 rounded ${totals.estaCuadrado ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className={`text-sm font-semibold ${totals.estaCuadrado ? 'text-green-800' : 'text-red-800'}`}>Diferencia (B-A)</p>
                <p className={`text-2xl font-bold ${totals.estaCuadrado ? 'text-green-600' : 'text-red-600'}`}>${totals.diferencia.toFixed(2)}</p>
              </div>
              <div className={`p-2 rounded flex flex-col justify-center items-center text-white ${totals.estaCuadrado ? 'bg-green-600' : 'bg-red-600'}`}>
                <p className="text-xs uppercase font-bold tracking-wider">Estado de Arqueo</p>
                <p className="text-xl font-black">{totals.estaCuadrado ? 'CUADRADO' : 'PENDIENTE'}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
              <button
                onClick={handleCloseShift}
                disabled={!totals.estaCuadrado || !hasPrinted}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition ${totals.estaCuadrado && hasPrinted
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-dashed border-gray-400 opacity-60'
                  }`}
              >
                <Download className="w-5 h-5" />
                <span>
                  {!totals.estaCuadrado
                    ? 'Bloqueado: Arqueo no Cuadrado'
                    : !hasPrinted
                      ? 'Bloqueado: Imprima el Resumen'
                      : 'Cerrar Turno y Excel'}
                </span>
              </button>
              <button
                onClick={handlePrint}
                className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 font-semibold flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimir Resumen</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
