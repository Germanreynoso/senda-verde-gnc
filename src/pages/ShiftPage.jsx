import React, { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import SurtidorCard from '../components/shift/SurtidorCard'
import { Printer, Download, Plus, Trash2, X } from 'lucide-react'
import { generateShiftExcel } from '../utils/excel'
import { formatDate } from '../utils/format'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

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

  const [isSaving, setIsSaving] = useState(false)

  // Sincronizar con el turno abierto si existe en la base de datos
  useEffect(() => {
    if (!data.shifts || data.shifts.length === 0) return

    const openShift = data.shifts.find(s => s.estado === 'abierto')

    if (openShift) {
      // Solo actualizamos si no hay turno activo o si cambió el ID
      if (!activeShift || activeShift.id !== openShift.id) {
        setActiveShift(openShift)
        setShiftForm({
          tipo: openShift.tipo,
          fecha: openShift.fecha,
          surtidores: openShift.surtidores || [
            { id: 1, lecturaInicial: '', lecturaFinal: '' },
            { id: 2, lecturaInicial: '', lecturaFinal: '' },
            { id: 3, lecturaInicial: '', lecturaFinal: '' },
            { id: 4, lecturaInicial: '', lecturaFinal: '' }
          ],
          ventas: openShift.ventas || [],
          depositos: openShift.depositos || []
        })
      }
    } else {
      // Solo si estamos seguros de que no hay turnos abiertos
      if (activeShift) setActiveShift(null)
    }
  }, [data.shifts, activeShift])

  const handleOpenShift = async () => {
    if (activeShift) return
    setHasPrinted(false)

    // Asegurarse de que los surtidores tengan la estructura base si están vacíos
    const initialSurtidores = shiftForm.surtidores.length > 0 ? shiftForm.surtidores : [
      { id: 1, lecturaInicial: '', lecturaFinal: '' },
      { id: 2, lecturaInicial: '', lecturaFinal: '' },
      { id: 3, lecturaInicial: '', lecturaFinal: '' },
      { id: 4, lecturaInicial: '', lecturaFinal: '' }
    ]

    const newShiftData = {
      ...shiftForm,
      surtidores: initialSurtidores,
      encargado: `${currentUser.nombre} ${currentUser.apellido}`,
      estado: 'abierto',
      fechaApertura: new Date().toISOString()
    }

    const savedShift = await addShift(newShiftData)
    if (savedShift) {
      setActiveShift(savedShift)
    }
  }

  const handleSaveProgress = async () => {
    if (!activeShift) return
    setIsSaving(true)
    const updatedShift = {
      ...activeShift,
      surtidores: shiftForm.surtidores,
      ventas: shiftForm.ventas,
      depositos: shiftForm.depositos
    }
    await updateShift(updatedShift)
    setIsSaving(false)
  }

  const handleUpdateSurtidor = (index, field, value) => {
    const newS = [...shiftForm.surtidores]
    newS[index][field] = value
    setShiftForm({ ...shiftForm, surtidores: newS })
  }

  const handleAddProductSale = async () => {
    try {
      if (!productSaleForm.productId || !productSaleForm.cantidad)
        return

      const product = data.products.find(p => p.id === parseInt(productSaleForm.productId))
      if (!product) return

      const cantidad = parseInt(productSaleForm.cantidad)
      if (isNaN(cantidad) || cantidad <= 0 || cantidad > product.stock) {
        toast.error(cantidad > product.stock ? 'Stock insuficiente' : 'Cantidad inválida')
        return
      }

      const venta = {
        id: Date.now(),
        productId: product.id,
        nombre: product.nombre,
        precio: product.precio,
        cantidad,
        total: product.precio * cantidad
      }

      const updatedVentas = [...shiftForm.ventas, venta]
      setShiftForm(prev => ({ ...prev, ventas: updatedVentas }))

      // Disminuir stock en DB
      await decreaseProductStock(product.id, cantidad)

      // Auto-guardar el turno con la nueva venta
      if (activeShift) {
        await updateShift({
          ...activeShift,
          surtidores: shiftForm.surtidores,
          ventas: updatedVentas,
          depositos: shiftForm.depositos
        })
      }

      setProductSaleForm({ productId: '', cantidad: '' })
      setProductSearch('')
    } catch (error) {
      console.error('Error en handleAddProductSale:', error)
      toast.error('Error al procesar la venta')
    }
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
      const { error: invokeError } = await supabase.functions.invoke('send-shift-report', {
        body: {
          shift: updatedShift,
          totals: totals,
          recipient: 'chombyferrari37.37.37@gmail.com'
        }
      });

      if (invokeError) throw invokeError;

      toast.success('¡Reporte Enviado!', {
        description: 'El resumen del turno ha sido enviado con éxito a chombyferrari37.37.37@gmail.com',
        duration: 5000,
      });
    } catch (error) {
      console.error('Error enviando mail:', error)
      toast.error('Error de Envío', {
        description: 'El turno se cerró pero no se pudo enviar el email de reporte.',
      });
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
        <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 tracking-tight">Abrir Turno</h2>
          <div className="space-y-6">
            <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Tipo de Turno</label>
              <select
                value={shiftForm.tipo}
                onChange={e => setShiftForm({ ...shiftForm, tipo: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Fecha</label>
              <input
                type="date"
                value={shiftForm.fecha}
                onChange={e => setShiftForm({ ...shiftForm, fecha: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenShift}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold no-print"
            >
              Abrir Turno
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-gray-100 dark:border-slate-700/50">
              <div>
                <h2 className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                  Turno {activeShift.tipo.toUpperCase()}
                </h2>
                <p className="text-gray-600">
                  {formatDate(activeShift.fecha)} | Operator: {activeShift.encargado}
                </p>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3 no-print">
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  disabled={isSaving}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-all ${isSaving
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'
                    }`}
                >
                  <Plus className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Progreso'}</span>
                </button>
                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                  {activeShift.estado}
                </span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>
              Gestión de Surtidores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 tracking-tight">Ventas de Productos</h2>

            <div className="mb-6 p-6 bg-blue-500/5 dark:bg-white/5 rounded-2xl border border-blue-200/20 dark:border-white/10 no-print">
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
                    className="px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full text-gray-800 dark:text-white transition-all"
                  />

                  {productSearch && (
                    <div className="absolute z-10 w-full mt-14 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto no-print backdrop-blur-xl">
                      {data.products
                        .filter(p => p.nombre.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setProductSaleForm({ ...productSaleForm, productId: p.id.toString() })
                              setProductSearch(p.nombre)
                            }}
                            className={`px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-100 dark:border-slate-700 last:border-b-0 flex justify-between items-center transition-colors ${productSaleForm.productId === p.id.toString() ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
                          >
                            <span className="font-medium text-gray-800 dark:text-white">{p.nombre}</span>
                            <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                              Stock: {p.stock}
                            </span>
                          </div>
                        ))}
                      {data.products.filter(p => p.nombre.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">No se encontraron productos</div>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={productSaleForm.cantidad}
                  onChange={e => setProductSaleForm({ ...productSaleForm, cantidad: e.target.value })}
                  className="px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full text-gray-800 dark:text-white transition-all"
                />
                <button
                  type="button"
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
          <div className="glass rounded-2xl shadow-xl p-8 border-l-4 border-yellow-500 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Control de Depósitos</h2>
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
                className="px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none w-full text-gray-800 dark:text-white transition-all"
              />
              <input
                type="number"
                placeholder="Monto ($)"
                value={depositForm.monto}
                onChange={e => setDepositForm({ ...depositForm, monto: e.target.value })}
                className="px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none w-full text-gray-800 dark:text-white transition-all"
              />
              <input
                type="text"
                placeholder="Nota (opcional)"
                value={depositForm.nota}
                onChange={e => setDepositForm({ ...depositForm, nota: e.target.value })}
                className="px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none w-full text-gray-800 dark:text-white transition-all"
              />
              <button
                type="button"
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
                      type="button"
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

          <div className="glass bg-blue-500/5 dark:bg-white/5 border border-blue-200/50 dark:border-white/10 rounded-2xl p-8 transition-all duration-300">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 tracking-tight">Conciliación Final</h3>
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
                type="button"
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
                type="button"
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
