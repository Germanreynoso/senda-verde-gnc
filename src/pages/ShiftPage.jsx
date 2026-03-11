import React, { useState, useEffect, useRef } from 'react'
import { useData } from '../context/DataContext'
import SurtidorCard from '../components/shift/SurtidorCard'
import { Printer, Download, Plus, Trash2, X, Edit2, Check } from 'lucide-react'
import { generateShiftExcel } from '../utils/excel'
import { formatDate, getTodayDate } from '../utils/format'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

export default function ShiftPage() {
  const { data, currentUser, addShift, decreaseProductStock, updateShift } = useData()
  const [activeShift, setActiveShift] = useState(null)
  const [shiftForm, setShiftForm] = useState({
    tipo: 'mañana',
    fecha: getTodayDate(),
    surtidores: [
      { id: 1, lecturaInicial: '', lecturaFinal: '' },
      { id: 2, lecturaInicial: '', lecturaFinal: '' },
      { id: 3, lecturaInicial: '', lecturaFinal: '' },
      { id: 4, lecturaInicial: '', lecturaFinal: '' }
    ],
    ventas: [],
    depositos: [],
    encargado: currentUser ? `${currentUser.nombre} ${currentUser.apellido}`.trim() : ''
  })

  const [productSaleForm, setProductSaleForm] = useState({ productId: '', cantidad: '' })
  const [productSearch, setProductSearch] = useState('')
  const [depositForm, setDepositForm] = useState({ monto: '', nota: '', numeroSobre: '' })
  const [hasPrinted, setHasPrinted] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [isEditingHeader, setIsEditingHeader] = useState(false)

  // Ref para rastrear el ID del turno activo sin causar re-renders ni closures stale
  const activeShiftIdRef = useRef(null)

  // Sincronizar con el turno abierto: activeShift siempre refleja la DB,
  // shiftForm solo se resetea cuando cambia el turno (ID distinto)
  useEffect(() => {
    if (!data.shifts) return

    const openShift = data.shifts.find(s => s.estado === 'abierto')

    if (openShift) {
      // Siempre actualizamos activeShift para que el UI refleje la DB sin refrescar
      setActiveShift(openShift)

      if (activeShiftIdRef.current !== openShift.id) {
        // Turno nuevo o distinto → resetear el formulario
        activeShiftIdRef.current = openShift.id
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
          depositos: openShift.depositos || [],
          encargado: openShift.encargado || `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim()
        })
      }
    } else {
      if (activeShiftIdRef.current !== null) {
        // El turno fue cerrado → limpiar todo
        activeShiftIdRef.current = null
        setActiveShift(null)
        setShiftForm(prev => ({
          ...prev,
          fecha: getTodayDate(),
          surtidores: [
            { id: 1, lecturaInicial: '', lecturaFinal: '' },
            { id: 2, lecturaInicial: '', lecturaFinal: '' },
            { id: 3, lecturaInicial: '', lecturaFinal: '' },
            { id: 4, lecturaInicial: '', lecturaFinal: '' }
          ],
          ventas: [],
          depositos: [],
          encargado: currentUser ? `${currentUser.nombre} ${currentUser.apellido}`.trim() : prev.encargado
        }))
      }
    }
  }, [data.shifts]) // Solo depende de data.shifts para evitar bucles

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
      fechaApertura: new Date().toISOString(),
      fecha: getTodayDate() // Asegurar que siempre sea la fecha de hoy al abrir uno nuevo
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
      tipo: shiftForm.tipo,
      fecha: shiftForm.fecha,
      encargado: shiftForm.encargado,
      surtidores: shiftForm.surtidores,
      ventas: shiftForm.ventas,
      depositos: shiftForm.depositos
    }
    await updateShift(updatedShift)
    setIsSaving(false)
    setIsEditingHeader(false)
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
      fechaCierre: new Date().toISOString(),
      encargado: shiftForm.encargado || `${currentUser.nombre} ${currentUser.apellido}`
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
      fecha: getTodayDate(),
      surtidores: [
        { id: 1, lecturaInicial: '', lecturaFinal: '' },
        { id: 2, lecturaInicial: '', lecturaFinal: '' },
        { id: 3, lecturaInicial: '', lecturaFinal: '' },
        { id: 4, lecturaInicial: '', lecturaFinal: '' }
      ],
      ventas: [],
      depositos: [],
      encargado: currentUser ? `${currentUser.nombre} ${currentUser.apellido}`.trim() : ''
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
              <div className="w-full md:w-auto">
                {isEditingHeader ? (
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800/50 mb-4 md:mb-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Tipo de Turno</label>
                        <select
                          value={shiftForm.tipo}
                          onChange={e => setShiftForm({ ...shiftForm, tipo: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="mañana">MAÑANA</option>
                          <option value="tarde">TARDE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Fecha</label>
                        <input
                          type="date"
                          value={shiftForm.fecha}
                          onChange={e => setShiftForm({ ...shiftForm, fecha: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Playero / Encargado</label>
                        <input
                          type="text"
                          value={shiftForm.encargado}
                          onChange={e => setShiftForm({ ...shiftForm, encargado: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nombre del encargado"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsEditingHeader(false)}
                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 uppercase"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveProgress}
                        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Confirmar Cambio
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center group">
                    <div>
                      <h2 className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight flex items-center">
                        Turno {shiftForm.tipo.toUpperCase()}
                      </h2>
                      <p className="text-gray-600 flex items-center">
                        {formatDate(shiftForm.fecha)} | Playero: {shiftForm.encargado || activeShift.encargado}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingHeader(true)}
                      className="ml-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full opacity-0 group-hover:opacity-100 transition-all no-print"
                      title="Editar Fecha o Turno"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3 no-print mt-4 md:mt-0">
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
            <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-blue-600 text-white border-b border-blue-700">
                    <th colSpan="7" className="px-4 py-3 text-center font-black uppercase tracking-widest text-lg">
                      AFORADORES (GNC)
                    </th>
                  </tr>
                  <tr className="bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-[11px] font-black uppercase text-gray-600 dark:text-gray-400">
                    <th className="px-6 py-4 text-center">SURTIDOR</th>
                    <th className="px-2 py-4"></th>
                    <th className="px-6 py-4 text-center">INICIO (m³)</th>
                    <th className="px-6 py-4 text-center">SALIDA (m³)</th>
                    <th className="px-6 py-4 text-center">METROS VENDIDOS</th>
                    <th className="px-6 py-4 text-center">PRECIO</th>
                    <th className="px-6 py-4 text-right">TOTAL (G)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {shiftForm.surtidores.map((s, i) => {
                    const metros = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
                    const totalSurtidor = metros * data.pricePerCubicMeter
                    return (
                      <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                        <td className="px-6 py-5 text-center font-black text-blue-600 dark:text-blue-400 text-lg">{s.id}</td>
                        <td className="px-2 py-5 w-4 font-bold text-gray-300">|</td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            step="0.01"
                            value={s.lecturaInicial}
                            onChange={e => handleUpdateSurtidor(i, 'lecturaInicial', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            step="0.01"
                            value={s.lecturaFinal}
                            onChange={e => handleUpdateSurtidor(i, 'lecturaFinal', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-gray-800 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-5 text-center font-black text-gray-700 dark:text-gray-200 bg-gray-50/50 dark:bg-slate-800/50">
                          {metros.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-center text-gray-500 dark:text-gray-400 font-medium">
                          ${data.pricePerCubicMeter.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-right font-black text-blue-600 dark:text-blue-400 text-lg">
                          ${totalSurtidor.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-slate-900 font-black border-t-2 border-gray-200 dark:border-slate-700">
                  <tr className="text-gray-800 dark:text-white">
                    <td className="px-6 py-5 text-center text-blue-600">TOTALES</td>
                    <td className="px-2 py-5"></td>
                    <td className="px-6 py-5 text-center bg-gray-100 dark:bg-slate-800">
                      {shiftForm.surtidores.reduce((acc, s) => acc + (parseFloat(s.lecturaInicial) || 0), 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-5 text-center bg-gray-100 dark:bg-slate-800">
                      {shiftForm.surtidores.reduce((acc, s) => acc + (parseFloat(s.lecturaFinal) || 0), 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-5 text-center text-blue-600">
                      {shiftForm.surtidores.reduce((acc, s) => acc + ((parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)), 0).toFixed(2)} m³
                    </td>
                    <td className="px-6 py-5 text-center"></td>
                    <td className="px-6 py-5 text-right text-blue-600 dark:text-blue-400 text-xl underline decoration-double">
                      ${totals.surtidores.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Sección de Ventas - APARTADO DISTINTO */}
          <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
            <div className="flex items-center mb-6">
              <span className="w-1.5 h-6 bg-purple-600 rounded-full mr-3"></span>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Ventas de Productos (VTA)</h2>
            </div>

            <div className="mb-6 p-6 bg-purple-500/5 dark:bg-white/5 rounded-2xl border border-purple-200/20 dark:border-white/10 no-print">
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
                    className="px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none w-full text-gray-800 dark:text-white transition-all shadow-sm"
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
                            className={`px-4 py-3 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 border-b border-gray-100 dark:border-slate-700 last:border-b-0 flex justify-between items-center transition-colors ${productSaleForm.productId === p.id.toString() ? 'bg-purple-100 dark:bg-purple-900/50' : ''}`}
                          >
                            <span className="font-medium text-gray-800 dark:text-white">{p.nombre}</span>
                            <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                              Stock: {p.stock}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={productSaleForm.cantidad}
                  onChange={e => setProductSaleForm({ ...productSaleForm, cantidad: e.target.value })}
                  className="px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none w-full text-gray-800 dark:text-white transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleAddProductSale}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 flex items-center justify-center space-x-2 font-bold shadow-lg transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  <span>Agregar Venta</span>
                </button>
              </div>
            </div>

            {shiftForm.ventas.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900/80">
                    <tr className="text-[10px] font-black uppercase text-gray-500 tracking-widest border-b border-gray-100 dark:border-slate-700">
                      <th className="px-6 py-4 text-left">Producto</th>
                      <th className="px-6 py-4 text-center">Cantidad</th>
                      <th className="px-6 py-4 text-center">Precio Unit.</th>
                      <th className="px-6 py-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {shiftForm.ventas.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{v.nombre}</td>
                        <td className="px-6 py-4 text-center font-bold text-gray-600 dark:text-gray-400">{v.cantidad}</td>
                        <td className="px-6 py-4 text-center text-gray-500">${v.precio.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-black text-gray-800 dark:text-white">${v.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-purple-50 dark:bg-purple-900/20 font-black">
                    <tr>
                      <td colSpan="3" className="px-6 py-5 text-right text-purple-600 uppercase tracking-widest text-sm">Total Ventas (VTA):</td>
                      <td className="px-6 py-5 text-right text-purple-700 dark:text-purple-400 text-xl border-t-2 border-purple-200 dark:border-purple-800">
                        ${totals.productos.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                <p className="text-gray-400 font-medium">No hay ventas registradas en este turno</p>
              </div>
            )}
          </div>

          {/* Sección de Depósitos */}
          <div className="glass rounded-2xl shadow-xl p-8 border-l-4 border-yellow-500 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight flex items-center">
                <span className="w-1.5 h-6 bg-yellow-500 rounded-full mr-3"></span>
                Efectivo Depositado
              </h2>
              <div className="flex space-x-2 mt-4 md:mt-0">
                <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-4 py-2 rounded-xl text-sm font-black border border-yellow-200 dark:border-yellow-800/50">
                  RECAUDADO EN SOBRES: ${totals.depositos.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 no-print p-6 bg-yellow-500/5 dark:bg-yellow-500/5 rounded-2xl border border-yellow-200/20">
              <input
                type="text"
                placeholder="N° de Sobre"
                value={depositForm.numeroSobre}
                onChange={e => setDepositForm({ ...depositForm, numeroSobre: e.target.value })}
                className="px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none w-full text-gray-800 dark:text-white transition-all shadow-sm"
              />
              <input
                type="number"
                placeholder="Monto ($)"
                value={depositForm.monto}
                onChange={e => setDepositForm({ ...depositForm, monto: e.target.value })}
                className="px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none w-full text-gray-800 dark:text-white transition-all shadow-sm"
              />
              <input
                type="text"
                placeholder="Nota (opcional)"
                value={depositForm.nota}
                onChange={e => setDepositForm({ ...depositForm, nota: e.target.value })}
                className="px-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none w-full text-gray-800 dark:text-white transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={handleAddDeposit}
                className="bg-yellow-600 text-white px-6 py-3 rounded-xl hover:bg-yellow-700 font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Sobre</span>
              </button>
            </div>

            {shiftForm.depositos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {shiftForm.depositos.map(d => (
                  <div key={d.id} className="group bg-white dark:bg-slate-800 border-2 border-yellow-100 dark:border-yellow-900/30 rounded-2xl p-4 flex flex-col relative overflow-hidden transition hover:border-yellow-400 shadow-sm">
                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                      N°{d.numeroSobre}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteDeposit(d.id)}
                      className="absolute top-1 left-1 p-1.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 no-print"
                      title="Eliminar sobre"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-2xl font-black text-gray-800 dark:text-white mt-4">${d.monto.toFixed(2)}</div>
                    <div className="text-[10px] font-bold text-gray-400 mt-2 flex justify-between items-center">
                      <span className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase">{d.hora} hs</span>
                      <span className="truncate ml-2 italic">{d.nota}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400 italic">No hay depósitos registrados</p>
              </div>
            )}
          </div>

          <div className="glass bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-900 dark:to-indigo-950 border-none rounded-3xl p-10 transition-all duration-300 text-white shadow-2xl">
            <h3 className="text-3xl font-black mb-10 tracking-tight flex items-center">
              Conciliación Final de Turno
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <p className="text-blue-100 text-xs font-black uppercase tracking-widest mb-2">GNC (G)</p>
                <p className="text-4xl font-black">${totals.surtidores.toFixed(2)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <p className="text-blue-100 text-xs font-black uppercase tracking-widest mb-2">Ventas (VTA)</p>
                <p className="text-4xl font-black">${totals.productos.toFixed(2)}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 ring-4 ring-white/10">
                <p className="text-blue-100 text-xs font-black uppercase tracking-widest mb-2">Venta Total (G + VTA)</p>
                <p className="text-4xl font-black text-yellow-300">${totals.total.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center border-t border-white/10 pt-10">
              <div className="flex items-center space-x-6">
                <div className={`p-6 rounded-3xl flex flex-col justify-center items-center ${totals.estaCuadrado ? 'bg-green-500' : 'bg-red-500'} shadow-lg min-w-[180px]`}>
                  <p className="text-[10px] uppercase font-black tracking-[0.2em] mb-1">Arqueo</p>
                  <p className="text-2xl font-black">{totals.estaCuadrado ? 'CUADRADO' : 'PENDIENTE'}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm font-bold">Diferencia con Sobres</p>
                  <p className={`text-4xl font-black ${totals.estaCuadrado ? 'text-green-300' : 'text-red-300'}`}>
                    ${totals.diferencia.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-blue-200 mt-1 italic">
                    {totals.estaCuadrado ? '¡Perfecto! El dinero en sobres coincide con la venta.' : 'Aún hay una diferencia que conciliar.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 no-print">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 bg-white text-blue-900 py-4 rounded-2xl hover:bg-blue-50 font-black flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-xl"
                >
                  <Printer className="w-6 h-6" />
                  <span>Imprimir Resumen</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseShift}
                  disabled={!totals.estaCuadrado || !hasPrinted}
                  className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-xl ${totals.estaCuadrado && hasPrinted
                    ? 'bg-green-500 text-white hover:bg-green-400'
                    : 'bg-white/10 text-white/40 cursor-not-allowed border-2 border-dashed border-white/20'
                    }`}
                >
                  <Download className="w-6 h-6" />
                  <span>
                    {!totals.estaCuadrado
                      ? 'No Cuadrado'
                      : !hasPrinted
                        ? 'Falta Imprimir'
                        : 'Cerrar Turno'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
