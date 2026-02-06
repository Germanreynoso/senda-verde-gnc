import React, { createContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DataContext = createContext()

export const DataProvider = ({ children }) => {
  const [data, setData] = useState({
    users: [],
    products: [],
    shifts: [],
    pricePerCubicMeter: 1500
  })

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('estacion-currentUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [loading, setLoading] = useState(true)

  // Fetch initial data from Supabase
  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: users } = await supabase.from('users').select('*')
      const { data: products } = await supabase.from('products').select('*')
      // Map products to ensure numbers (decirmal -> number)
      const formattedProducts = products?.map(p => ({
        ...p,
        precio: Number(p.precio),
        stock: Number(p.stock)
      })) || []

      const { data: shifts } = await supabase.from('shifts').select('*').order('created_at', { ascending: false })

      setData(prev => ({
        ...prev,
        users: users || [],
        products: formattedProducts,
        shifts: shifts || []
      }))
    } catch (error) {
      console.error('Error fetching from Supabase:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('estacion-currentUser', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('estacion-currentUser')
    }
  }, [currentUser])

  const login = async (nombre, password) => {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('nombre', nombre)
      .eq('password', password)
      .single()

    if (users) {
      setCurrentUser(users)
      return users
    }
    return null
  }

  const logout = () => setCurrentUser(null)

  const saveUser = async (user) => {
    if (user.id) {
      const { error } = await supabase.from('users').update(user).eq('id', user.id)
      if (!error) fetchData()
    } else {
      const { error } = await supabase.from('users').insert([user])
      if (!error) fetchData()
    }
  }

  const deleteUser = async (id) => {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (!error) {
      fetchData()
      if (currentUser?.id === id) setCurrentUser(null)
    }
  }

  const saveProduct = async (product) => {
    const safeProduct = {
      nombre: product.nombre,
      precio: Number(product.precio),
      stock: Number(product.stock),
      categoria: product.categoria
    }

    if (product.id) {
      const { error } = await supabase.from('products').update(safeProduct).eq('id', product.id)
      if (!error) fetchData()
    } else {
      const { error } = await supabase.from('products').insert([safeProduct])
      if (!error) fetchData()
    }
  }

  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) fetchData()
  }

  const decreaseProductStock = async (productId, cantidad) => {
    const product = data.products.find(p => p.id === productId)
    if (product) {
      const newStock = product.stock - cantidad
      const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', productId)
      if (!error) fetchData()
    }
  }

  const addShift = async (shift) => {
    // Standardize field names for DB (snake_case is common in PG)
    const dbShift = {
      tipo: shift.tipo,
      fecha: shift.fecha,
      encargado: shift.encargado,
      estado: shift.estado,
      fecha_apertura: shift.fechaApertura,
      surtidores: shift.surtidores,
      ventas: shift.ventas
    }
    const { data: newShift, error } = await supabase.from('shifts').insert([dbShift]).select().single()
    if (!error) {
      fetchData()
      return newShift
    }
  }

  const updateShift = async (shift) => {
    const dbShift = {
      estado: shift.estado,
      fecha_cierre: shift.fechaCierre,
      surtidores: shift.surtidores,
      ventas: shift.ventas
    }
    const { error } = await supabase.from('shifts').update(dbShift).eq('id', shift.id)
    if (!error) fetchData()
  }

  return (
    <DataContext.Provider value={{
      data,
      setData,
      currentUser,
      setCurrentUser,
      loading,
      login,
      logout,
      saveUser,
      deleteUser,
      saveProduct,
      deleteProduct,
      decreaseProductStock,
      addShift,
      updateShift
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => React.useContext(DataContext)
