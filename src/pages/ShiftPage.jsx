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
    tipo: 'maÃ±ana',
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
        // Turno nuevo o distinto â†’ resetear el formulario
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
        // El turno fue cerrado â†’ limpiar todo
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

    // Asegurarse de que los surtidores tengan la estructura base si estÃ¡n vacÃ­os
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
        toast.error(cantidad > product.stock ? 'Stock insuficiente' : 'Cantidad invÃ¡lida')
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
    // Sugerimos el siguiente nÃºmero de sobre si es numÃ©rico
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

    if (!confirm('Â¿EstÃ¡ seguro de cerrar el turno?')) return
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

      toast.success('Â¡Reporte Enviado!', {
        description: 'El resumen del turno ha sido enviado con Ã©xito a chombyferrari37.37.37@gmail.com',
        duration: 5000,
      });
    } catch (error) {
      console.error('Error enviando mail:', error)
      toast.error('Error de EnvÃ­o', {
        description: 'El turno se cerrÃ³ pero no se pudo enviar el email de reporte.',
      });
    }

    generateShiftExcel(updatedShift, data.pricePerCubicMeter)
    setActiveShift(null)
    setHasPrinted(false)
    setShiftForm({
      tipo: 'maÃ±ana',
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
    <div className="space-y-6 w-full">
      {!activeShift ? (

        /* â”€â”€ PANTALLA ABRIR TURNO â”€â”€ */
        <div className="glass rounded-3xl shadow-2xl p-10 max-w-xl mx-auto">
          <h1 className="text-4xl font-black text-gray-800 dark:text-white mb-2 text-center">Abrir Turno</h1>
          <p className="text-center text-gray-500 dark:text-gray-400 text-lg mb-10">Complete los datos para iniciar el turno</p>

          <div className="space-y-6">
            <div>
              <label className="block text-xl font-black text-gray-700 dark:text-gray-200 mb-2">Turno</label>
              <select
                value={shiftForm.tipo}
                onChange={e => setShiftForm({ ...shiftForm, tipo: e.target.value })}
                className="w-full px-5 py-4 text-xl bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-400 outline-none text-gray-800 dark:text-white font-bold"
              >
                <option value="maÃ±ana">â˜€ï¸  MaÃ±ana</option>
                <option value="tarde">ðŸŒ…  Tarde</option>
              </select>
            </div>

            <div>
              <label className="block text-xl font-black text-gray-700 dark:text-gray-200 mb-2">Fecha</label>
              <input
                type="date"
                value={shiftForm.fecha}
                onChange={e => setShiftForm({ ...shiftForm, fecha: e.target.value })}
                className="w-full px-5 py-4 text-xl bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-400 outline-none text-gray-800 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenShift}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl hover:bg-blue-700 font-black text-2xl transition-all active:scale-95 shadow-xl"
            >
              â–¶&nbsp;&nbsp;Abrir Turno
            </button>
          </div>
        </div>

      ) : (
        <>
          {/* â”€â”€ HEADER â”€â”€ */}
          <div className="glass rounded-2xl shadow-xl px-8 py-5 flex items-center justify-between">
            {isEditingHeader ? (
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <select
                  value={shiftForm.tipo}
                  onChange={e => setShiftForm({ ...shiftForm, tipo: e.target.value })}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="maÃ±ana">MAÃ‘ANA</option>
                  <option value="tarde">TARDE</option>
                </select>
                <input
                  type="date"
                  value={shiftForm.fecha}
                  onChange={e => setShiftForm({ ...shiftForm, fecha: e.target.value })}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-xl text-base text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={shiftForm.encargado}
                  onChange={e => setShiftForm({ ...shiftForm, encargado: e.target.value })}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-xl text-base text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Encargado"
                />
                <button onClick={handleSaveProgress} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-black rounded-lg hover:bg-blue-700 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Guardar
                </button>
                <button onClick={() => setIsEditingHeader(false)} className="px-3 py-1.5 text-sm font-bold text-gray-500 hover:text-gray-700">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <div className="bg-blue-600 text-white font-black text-lg px-4 py-1.5 rounded-lg">
                  Turno {shiftForm.tipo.toUpperCase()}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{formatDate(shiftForm.fecha)}</p>
                <p className="text-gray-700 dark:text-gray-200 text-sm font-semibold">Playero: <strong>{shiftForm.encargado || activeShift.encargado}</strong></p>
                <button
                  onClick={() => setIsEditingHeader(true)}
                  className="ml-1 p-1 text-gray-300 hover:text-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all no-print"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 no-print ml-4 shrink-0">
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-base font-black uppercase tracking-widest border-2 border-green-200">
                {activeShift.estado}
              </span>
              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={isSaving}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-base transition-all ${isSaving ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white border-2 border-blue-200 hover:border-blue-600'}`}
              >
                <Plus className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
                {isSaving ? 'Guardando...' : 'Guardar Progreso'}
              </button>
            </div>
          </div>


          {/* LAYOUT 2 COLUMNAS */}
          <div className="grid grid-cols-[1fr_340px] gap-4 items-start">

            {/* COLUMNA IZQUIERDA: Paso 1 + 2 + 3 */}
            <div className="space-y-4">

              {/* PASO 1 - AFORADORES */}
              <div className="glass rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 px-5 py-3 flex items-center gap-3">
                  <span className="bg-white text-blue-600 font-black text-lg w-9 h-9 rounded-full flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Paso 1</p>
                    <h2 className="text-white font-black text-lg leading-tight">Lecturas de los Surtidores (GNC)</h2>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 px-5 py-2 border-b border-blue-100 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-300 text-sm font-semibold">
                    Escriba la lectura del comienzo y la lectura del final de cada surtidor.
                  </p>
                </div>

                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700">
                      <th className="px-3 py-2 text-center text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wide w-20">Surtidor</th>
                      <th className="px-3 py-2 text-center text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wide">Lectura Inicio</th>
                      <th className="px-3 py-2 text-center text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wide">Lectura Final</th>
                      <th className="px-3 py-2 text-center text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wide">M3 Vendidos</th>
                      <th className="px-3 py-2 text-center text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wide">Precio/M3</th>
                      <th className="px-3 py-2 text-right text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wide">Total GNC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {shiftForm.surtidores.map((s, i) => {
                      const metros = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
                      const totalSurtidor = metros * data.pricePerCubicMeter
                      return (
                        <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                          <td className="px-3 py-2 text-center">
                            <span className="font-black text-blue-600 dark:text-blue-400 text-2xl">{s.id}</span>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={s.lecturaInicial}
                              onChange={e => handleUpdateSurtidor(i, 'lecturaInicial', e.target.value)}
                              className="w-full px-3 py-2 text-base bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-center font-black text-gray-800 dark:text-white"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={s.lecturaFinal}
                              onChange={e => handleUpdateSurtidor(i, 'lecturaFinal', e.target.value)}
                              className="w-full px-3 py-2 text-base bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-center font-black text-gray-800 dark:text-white"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-black text-base ${metros > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                              {metros.toFixed(2)} m3
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 font-bold text-sm">
                            ${data.pricePerCubicMeter.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-black text-base text-blue-700 dark:text-blue-400">
                              ${totalSurtidor.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-600 text-white">
                      <td className="px-3 py-2 text-center font-black text-xs uppercase tracking-wide">TOTAL</td>
                      <td className="px-3 py-2 text-center font-black text-sm">
                        {shiftForm.surtidores.reduce((a, s) => a + (parseFloat(s.lecturaInicial) || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center font-black text-sm">
                        {shiftForm.surtidores.reduce((a, s) => a + (parseFloat(s.lecturaFinal) || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center font-black text-sm">
                        {shiftForm.surtidores.reduce((a, s) => a + ((parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)), 0).toFixed(2)} m3
                      </td>
                      <td></td>
                      <td className="px-3 py-2 text-right font-black text-lg">
                        ${totals.surtidores.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PASO 2 - VENTAS */}
              <div className="glass rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-purple-600 px-5 py-3 flex items-center gap-3">
                  <span className="bg-white text-purple-600 font-black text-lg w-9 h-9 rounded-full flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Paso 2</p>
                    <h2 className="text-white font-black text-lg leading-tight">Ventas de Productos</h2>
                  </div>
                  {shiftForm.ventas.length > 0 && (
                    <span className="ml-auto text-white/90 font-black text-base">${totals.productos.toFixed(2)}</span>
                  )}
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 px-5 py-2 border-b border-purple-100 dark:border-purple-800">
                  <p className="text-purple-700 dark:text-purple-300 text-sm font-semibold">
                    Busque el producto vendido, ingrese la cantidad y presione "Agregar".
                  </p>
                </div>
                <div className="p-4 no-print">
                  <div className="grid grid-cols-[1fr_120px_auto] gap-3 items-end">
                    <div>
                      <label className="block text-sm font-black text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Producto</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Escriba el nombre del producto..."
                          value={productSearch}
                          onChange={e => {
                            setProductSearch(e.target.value)
                            setProductSaleForm({ ...productSaleForm, productId: '' })
                          }}
                          className="w-full px-4 py-2.5 text-base bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none text-gray-800 dark:text-white"
                        />
                        {productSearch && (
                          <div className="absolute z-10 w-full top-full mt-1 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                            {data.products.filter(p => p.nombre.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setProductSaleForm({ ...productSaleForm, productId: p.id.toString() })
                                  setProductSearch(p.nombre)
                                }}
                                className={`px-4 py-3 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 border-b border-gray-100 dark:border-slate-700 last:border-0 flex justify-between items-center text-base ${productSaleForm.productId === p.id.toString() ? 'bg-purple-100 dark:bg-purple-900/40' : ''}`}
                              >
                                <span className="font-bold text-gray-800 dark:text-white">{p.nombre}</span>
                                <span className="font-black bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-gray-600 dark:text-gray-300 text-xs">Stock: {p.stock}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Cantidad</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={productSaleForm.cantidad}
                        onChange={e => setProductSaleForm({ ...productSaleForm, cantidad: e.target.value })}
                        className="w-full px-4 py-2.5 text-base bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none text-center font-black text-gray-800 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddProductSale}
                      className="bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 flex items-center gap-2 font-black text-base transition-all active:scale-95 shadow-lg whitespace-nowrap"
                    >
                      <Plus className="w-5 h-5" /> Agregar
                    </button>
                  </div>
                </div>
                {shiftForm.ventas.length > 0 ? (
                  <table className="w-full border-collapse border-t-2 border-gray-100 dark:border-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="px-4 py-2 text-left text-xs font-black text-gray-500 uppercase tracking-wide">Producto</th>
                        <th className="px-4 py-2 text-center text-xs font-black text-gray-500 uppercase tracking-wide">Cant.</th>
                        <th className="px-4 py-2 text-center text-xs font-black text-gray-500 uppercase tracking-wide">Precio</th>
                        <th className="px-4 py-2 text-right text-xs font-black text-gray-500 uppercase tracking-wide">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {shiftForm.ventas.map(v => (
                        <tr key={v.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10">
                          <td className="px-4 py-2 font-bold text-gray-800 dark:text-white text-base">{v.nombre}</td>
                          <td className="px-4 py-2 text-center font-black text-gray-600 dark:text-gray-300 text-base">{v.cantidad}</td>
                          <td className="px-4 py-2 text-center text-gray-500 text-sm">${v.precio.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-black text-purple-700 dark:text-purple-300 text-base">${v.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-purple-600 text-white">
                        <td colSpan="3" className="px-4 py-2 text-right font-black text-sm uppercase tracking-wide">Total Ventas:</td>
                        <td className="px-4 py-2 text-right font-black text-lg">${totals.productos.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div className="mx-4 mb-4 text-center py-5 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl">
                    <p className="text-gray-400 text-base font-semibold">No hay ventas registradas todavia</p>
                  </div>
                )}
              </div>

              {/* PASO 3 - SOBRES (formulario horizontal) */}
              <div className="glass rounded-2xl shadow-xl overflow-hidden border-l-4 border-yellow-500">
                <div className="bg-yellow-500 px-5 py-3 flex items-center gap-3">
                  <span className="bg-white text-yellow-600 font-black text-lg w-9 h-9 rounded-full flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Paso 3</p>
                    <h2 className="text-white font-black text-lg leading-tight">Sobres de Dinero</h2>
                  </div>
                  <span className="ml-auto text-white font-black text-base">${totals.depositos.toFixed(2)}</span>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 px-5 py-2 border-b border-yellow-100 dark:border-yellow-800">
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm font-semibold">
                    Por cada sobre que entregue, anote el numero y el monto, luego presione "Registrar".
                  </p>
                </div>
                <div className="p-4 no-print bg-yellow-50/30 dark:bg-yellow-900/10">
                  <div className="grid grid-cols-[140px_1fr_1fr_auto] gap-3 items-end">
                    <div>
                      <label className="block text-sm font-black text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">N de Sobre</label>
                      <input
                        type="text"
                        placeholder="Ej: 1, 2..."
                        value={depositForm.numeroSobre}
                        onChange={e => setDepositForm({ ...depositForm, numeroSobre: e.target.value })}
                        className="w-full px-3 py-2.5 text-base bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-gray-800 dark:text-white font-black text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Monto ($)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={depositForm.monto}
                        onChange={e => setDepositForm({ ...depositForm, monto: e.target.value })}
                        className="w-full px-3 py-2.5 text-lg bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-gray-800 dark:text-white font-black text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Nota (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej: pago combustible..."
                        value={depositForm.nota}
                        onChange={e => setDepositForm({ ...depositForm, nota: e.target.value })}
                        className="w-full px-3 py-2.5 text-base bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-gray-800 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDeposit}
                      className="bg-yellow-500 text-white px-5 py-2.5 rounded-xl hover:bg-yellow-600 font-black text-base transition-all active:scale-95 shadow-lg flex items-center gap-2 whitespace-nowrap"
                    >
                      <Plus className="w-5 h-5" /> Registrar
                    </button>
                  </div>
                </div>
                {shiftForm.depositos.length > 0 ? (
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    {shiftForm.depositos.map(d => (
                      <div key={d.id} className="group relative bg-white dark:bg-slate-800 border-2 border-yellow-200 dark:border-yellow-900/40 rounded-xl px-4 py-2 flex items-center gap-3 hover:border-yellow-400 transition-colors">
                        <span className="bg-yellow-400 text-yellow-900 font-black text-sm px-2 py-0.5 rounded-lg">N{d.numeroSobre}</span>
                        <span className="font-black text-lg text-gray-800 dark:text-white">${d.monto.toFixed(2)}</span>
                        {d.nota && <span className="text-xs text-gray-400 italic">{d.nota}</span>}
                        <button
                          type="button"
                          onClick={() => handleDeleteDeposit(d.id)}
                          className="p-1 bg-red-100 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-all no-print"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm italic py-3 px-5">Aun no registro ningun sobre</p>
                )}
              </div>

            </div>

            {/* COLUMNA DERECHA: Paso 4 sticky */}
            <div>
              <div className="rounded-2xl shadow-2xl overflow-hidden sticky top-4">
                <div className="bg-gradient-to-br from-blue-700 to-indigo-800 px-5 py-3 flex items-center gap-3">
                  <span className="bg-white text-blue-700 font-black text-lg w-9 h-9 rounded-full flex items-center justify-center shrink-0">4</span>
                  <div>
                    <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Paso 4</p>
                    <h2 className="text-white font-black text-lg leading-tight">Cierre del Turno</h2>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-4 text-white space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white/10 rounded-xl px-4 py-3">
                      <span className="text-blue-100 text-sm font-black uppercase tracking-wide">GNC (Surtidores)</span>
                      <span className="text-xl font-black">${totals.surtidores.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 rounded-xl px-4 py-3">
                      <span className="text-blue-100 text-sm font-black uppercase tracking-wide">Ventas Productos</span>
                      <span className="text-xl font-black">${totals.productos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-yellow-400/20 border-2 border-yellow-400/40 rounded-xl px-4 py-4">
                      <span className="text-yellow-300 text-base font-black uppercase tracking-wide">TOTAL A COBRAR</span>
                      <span className="text-2xl font-black text-yellow-300">${totals.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 rounded-xl px-4 py-3">
                      <span className="text-blue-100 text-sm font-black uppercase tracking-wide">Dinero en Sobres</span>
                      <span className="text-xl font-black">${totals.depositos.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className={`rounded-xl px-4 py-4 flex items-center justify-between border-2 ${totals.estaCuadrado ? 'bg-green-500/30 border-green-400' : 'bg-red-500/20 border-red-400'}`}>
                    <div>
                      <p className="text-white/70 text-xs font-black uppercase tracking-wider mb-0.5">Diferencia</p>
                      <p className={`text-3xl font-black ${totals.estaCuadrado ? 'text-green-300' : 'text-red-300'}`}>
                        ${totals.diferencia.toFixed(2)}
                      </p>
                      <p className="text-xs mt-1 font-semibold text-white/70">
                        {totals.estaCuadrado ? 'Los sobres coinciden con lo vendido.' : 'Revise los sobres, hay diferencia.'}
                      </p>
                    </div>
                    <div className={`text-center px-4 py-3 rounded-xl font-black ${totals.estaCuadrado ? 'bg-green-500' : 'bg-red-500'}`}>
                      <p className="text-[10px] uppercase tracking-widest text-white/80 mb-1">Arqueo</p>
                      <p className="text-xl">{totals.estaCuadrado ? 'OK' : 'NO'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 no-print">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="w-full bg-white text-blue-900 py-3 rounded-xl hover:bg-blue-50 font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl"
                    >
                      <Printer className="w-5 h-5" /> Imprimir Resumen
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseShift}
                      disabled={!totals.estaCuadrado || !hasPrinted}
                      className={`w-full py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${totals.estaCuadrado && hasPrinted ? 'bg-green-500 text-white hover:bg-green-400 shadow-xl' : 'bg-white/10 text-white/40 cursor-not-allowed border-2 border-dashed border-white/20'}`}
                    >
                      <Download className="w-5 h-5" />
                      {!totals.estaCuadrado ? 'Arqueo no cuadrado' : !hasPrinted ? 'Imprima primero el resumen' : 'Cerrar Turno'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
