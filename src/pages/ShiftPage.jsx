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
    <div className="space-y-4">
      {!activeShift ? (
        /* ── PANTALLA ABRIR TURNO ── */
        <div className="glass rounded-2xl shadow-xl p-8 max-w-lg mx-auto">
          <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6 tracking-tight">Abrir Turno</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-widest">Tipo de Turno</label>
              <select
                value={shiftForm.tipo}
                onChange={e => setShiftForm({ ...shiftForm, tipo: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-white font-bold"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-widest">Fecha</label>
              <input
                type="date"
                value={shiftForm.fecha}
                onChange={e => setShiftForm({ ...shiftForm, fecha: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenShift}
              className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-black tracking-wide transition-all active:scale-95 shadow-lg"
            >
              Abrir Turno
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── HEADER BAR ── */}
          <div className="glass rounded-2xl shadow-xl px-6 py-4 flex items-center justify-between">
            {isEditingHeader ? (
              <div className="flex items-center gap-3 flex-1">
                <select
                  value={shiftForm.tipo}
                  onChange={e => setShiftForm({ ...shiftForm, tipo: e.target.value })}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mañana">MAÑANA</option>
                  <option value="tarde">TARDE</option>
                </select>
                <input
                  type="date"
                  value={shiftForm.fecha}
                  onChange={e => setShiftForm({ ...shiftForm, fecha: e.target.value })}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={shiftForm.encargado}
                  onChange={e => setShiftForm({ ...shiftForm, encargado: e.target.value })}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Encargado"
                />
                <button onClick={handleSaveProgress} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-black rounded-lg hover:bg-blue-700 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Confirmar
                </button>
                <button onClick={() => setIsEditingHeader(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h2 className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                  Turno {shiftForm.tipo.toUpperCase()}
                </h2>
                <span className="text-gray-400 text-sm">|</span>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{formatDate(shiftForm.fecha)}</p>
                <span className="text-gray-400 text-sm">|</span>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-semibold">{shiftForm.encargado || activeShift.encargado}</p>
                <button
                  onClick={() => setIsEditingHeader(true)}
                  className="ml-1 p-1 text-gray-300 hover:text-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all no-print"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 no-print">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                {activeShift.estado}
              </span>
              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-all ${isSaving ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
              >
                <Plus className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {/* ── LAYOUT 2 COLUMNAS ── */}
          <div className="grid grid-cols-[1fr_360px] gap-4 items-start">

            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-4">

              {/* TABLA AFORADORES */}
              <div className="glass rounded-2xl shadow-xl overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th colSpan="6" className="px-5 py-2.5 text-center font-black uppercase tracking-widest text-sm">
                        AFORADORES (GNC)
                      </th>
                    </tr>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wide">
                      <th className="px-5 py-3 text-center w-24">Surtidor</th>
                      <th className="px-4 py-3 text-center">Inicio (m³)</th>
                      <th className="px-4 py-3 text-center">Salida (m³)</th>
                      <th className="px-4 py-3 text-center">Metros</th>
                      <th className="px-4 py-3 text-center">Precio</th>
                      <th className="px-4 py-3 text-right">Total (G)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {shiftForm.surtidores.map((s, i) => {
                      const metros = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
                      const totalSurtidor = metros * data.pricePerCubicMeter
                      return (
                        <tr key={s.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                          <td className="px-5 py-3 text-center font-black text-blue-600 dark:text-blue-400 text-base">{s.id}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={s.lecturaInicial}
                              onChange={e => handleUpdateSurtidor(i, 'lecturaInicial', e.target.value)}
                              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-gray-800 dark:text-white text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={s.lecturaFinal}
                              onChange={e => handleUpdateSurtidor(i, 'lecturaFinal', e.target.value)}
                              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-gray-800 dark:text-white text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-center font-black text-gray-700 dark:text-gray-200 bg-gray-50/50 dark:bg-slate-800/30">
                            {metros.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-500 text-xs font-medium">
                            ${data.pricePerCubicMeter.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-blue-600 dark:text-blue-400">
                            ${totalSurtidor.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-slate-900 border-t-2 border-blue-200 dark:border-blue-900">
                    <tr className="font-black text-sm">
                      <td className="px-5 py-3 text-center text-blue-600 dark:text-blue-400 text-xs uppercase tracking-widest">Totales</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800">
                        {shiftForm.surtidores.reduce((a, s) => a + (parseFloat(s.lecturaInicial) || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800">
                        {shiftForm.surtidores.reduce((a, s) => a + (parseFloat(s.lecturaFinal) || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400">
                        {shiftForm.surtidores.reduce((a, s) => a + ((parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)), 0).toFixed(2)} m³
                      </td>
                      <td></td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 text-base underline decoration-double">
                        ${totals.surtidores.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* VENTAS */}
              <div className="glass rounded-2xl shadow-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="w-1 h-5 bg-purple-600 rounded-full"></span>
                    Ventas de Productos
                    <span className="text-xs font-black text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">VTA</span>
                  </h2>
                  {shiftForm.ventas.length > 0 && (
                    <span className="text-purple-600 font-black text-sm">${totals.productos.toFixed(2)}</span>
                  )}
                </div>

                {/* Formulario agregar venta */}
                <div className="flex gap-3 mb-4 no-print">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={productSearch}
                      onChange={e => {
                        setProductSearch(e.target.value)
                        setProductSaleForm({ ...productSaleForm, productId: '' })
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white text-sm"
                    />
                    {productSearch && (
                      <div className="absolute z-10 w-full top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                        {data.products.filter(p => p.nombre.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setProductSaleForm({ ...productSaleForm, productId: p.id.toString() })
                              setProductSearch(p.nombre)
                            }}
                            className={`px-4 py-2.5 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 border-b border-gray-100 dark:border-slate-700 last:border-0 flex justify-between items-center text-sm ${productSaleForm.productId === p.id.toString() ? 'bg-purple-100 dark:bg-purple-900/40' : ''}`}
                          >
                            <span className="font-medium text-gray-800 dark:text-white">{p.nombre}</span>
                            <span className="text-[10px] font-black bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400">Stock: {p.stock}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Cant."
                    value={productSaleForm.cantidad}
                    onChange={e => setProductSaleForm({ ...productSaleForm, cantidad: e.target.value })}
                    className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white text-sm text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddProductSale}
                    className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 flex items-center gap-2 font-bold text-sm transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                </div>

                {shiftForm.ventas.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 dark:border-slate-700">
                      <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <th className="pb-2 text-left">Producto</th>
                        <th className="pb-2 text-center">Cant.</th>
                        <th className="pb-2 text-center">Precio</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                      {shiftForm.ventas.map(v => (
                        <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="py-2 font-medium text-gray-800 dark:text-white">{v.nombre}</td>
                          <td className="py-2 text-center font-bold text-gray-500">{v.cantidad}</td>
                          <td className="py-2 text-center text-gray-400 text-xs">${v.precio.toFixed(2)}</td>
                          <td className="py-2 text-right font-black text-gray-800 dark:text-white">${v.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-purple-200 dark:border-purple-900">
                      <tr>
                        <td colSpan="3" className="pt-2 text-right text-purple-600 font-black text-xs uppercase tracking-widest">Total VTA:</td>
                        <td className="pt-2 text-right text-purple-700 dark:text-purple-400 font-black">${totals.productos.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-xl">
                    <p className="text-gray-400 text-sm">Sin ventas registradas</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-4">

              {/* DEPÓSITOS */}
              <div className="glass rounded-2xl shadow-xl p-5 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="w-1 h-5 bg-yellow-500 rounded-full"></span>
                    Depósitos
                  </h2>
                  <span className="text-yellow-600 font-black text-sm">${totals.depositos.toFixed(2)}</span>
                </div>

                {/* Formulario sobre */}
                <div className="space-y-2 mb-4 p-3 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200/30 rounded-xl no-print overflow-hidden">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="N° Sobre"
                      value={depositForm.numeroSobre}
                      onChange={e => setDepositForm({ ...depositForm, numeroSobre: e.target.value })}
                      className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-gray-800 dark:text-white text-sm text-center font-bold"
                    />
                    <input
                      type="number"
                      placeholder="Monto ($)"
                      value={depositForm.monto}
                      onChange={e => setDepositForm({ ...depositForm, monto: e.target.value })}
                      className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-gray-800 dark:text-white text-sm font-bold"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nota (opcional)"
                      value={depositForm.nota}
                      onChange={e => setDepositForm({ ...depositForm, nota: e.target.value })}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-gray-800 dark:text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddDeposit}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 font-bold text-sm transition-all active:scale-95 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                    </button>
                  </div>
                </div>

                {/* Lista sobres */}
                {shiftForm.depositos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {shiftForm.depositos.map(d => (
                      <div key={d.id} className="group relative bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-900/40 rounded-xl p-3 hover:border-yellow-400 transition-colors">
                        <span className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl uppercase">N°{d.numeroSobre}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeposit(d.id)}
                          className="absolute top-1 left-1 p-1 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 no-print"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="text-lg font-black text-gray-800 dark:text-white mt-2">${d.monto.toFixed(2)}</div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{d.hora}</span>
                          <span className="text-[10px] text-gray-400 italic truncate max-w-[80px]">{d.nota}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm italic py-4">Sin depósitos registrados</p>
                )}
              </div>

              {/* CONCILIACIÓN */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-900 dark:to-indigo-950 rounded-2xl p-5 text-white shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-widest mb-4 text-blue-200">Conciliación Final</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center bg-white/10 rounded-xl px-4 py-2.5">
                    <span className="text-blue-200 text-xs font-black uppercase tracking-wider">GNC (G)</span>
                    <span className="text-xl font-black">${totals.surtidores.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-xl px-4 py-2.5">
                    <span className="text-blue-200 text-xs font-black uppercase tracking-wider">Ventas (VTA)</span>
                    <span className="text-xl font-black">${totals.productos.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/20 rounded-xl px-4 py-3 ring-2 ring-white/10">
                    <span className="text-yellow-300 text-xs font-black uppercase tracking-wider">G + VTA</span>
                    <span className="text-2xl font-black text-yellow-300">${totals.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className={`flex justify-between items-center rounded-xl px-4 py-3 mb-4 ${totals.estaCuadrado ? 'bg-green-500/30 border border-green-400/40' : 'bg-red-500/30 border border-red-400/40'}`}>
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Diferencia (Sobres - Total)</p>
                    <p className={`text-2xl font-black ${totals.estaCuadrado ? 'text-green-300' : 'text-red-300'}`}>
                      ${totals.diferencia.toFixed(2)}
                    </p>
                  </div>
                  <div className={`px-3 py-2 rounded-lg text-center ${totals.estaCuadrado ? 'bg-green-500' : 'bg-red-500'}`}>
                    <p className="text-[9px] uppercase font-black tracking-widest">Arqueo</p>
                    <p className="text-sm font-black">{totals.estaCuadrado ? 'CUADRADO' : 'PENDIENTE'}</p>
                  </div>
                </div>

                <div className="flex gap-2 no-print">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex-1 bg-white text-blue-900 py-2.5 rounded-xl hover:bg-blue-50 font-black flex items-center justify-center gap-2 text-sm transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseShift}
                    disabled={!totals.estaCuadrado || !hasPrinted}
                    className={`flex-1 py-2.5 rounded-xl font-black flex items-center justify-center gap-2 text-sm transition-all active:scale-95 ${totals.estaCuadrado && hasPrinted
                      ? 'bg-green-500 text-white hover:bg-green-400 shadow-lg'
                      : 'bg-white/10 text-white/40 cursor-not-allowed border border-dashed border-white/20'
                      }`}
                  >
                    <Download className="w-4 h-4" />
                    {!totals.estaCuadrado ? 'No cuadrado' : !hasPrinted ? 'Falta imprimir' : 'Cerrar Turno'}
                  </button>
                </div>
              </div>

            </div>{/* fin columna derecha */}
          </div>{/* fin grid */}
        </>
      )}
    </div>
  )
}

