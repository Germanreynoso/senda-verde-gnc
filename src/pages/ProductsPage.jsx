import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import ProductForm from '../components/products/ProductForm'
import ProductTable from '../components/products/ProductTable'

export default function ProductsPage() {
  const { data, saveProduct, deleteProduct } = useData()
  const [editingProduct, setEditingProduct] = useState(null)

  return (
    <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 tracking-tight">Gestión de Productos</h2>
      <div className="mb-8 p-6 bg-blue-500/5 dark:bg-white/5 rounded-2xl border border-blue-200/20 dark:border-white/10">
        <ProductForm
          onSave={saveProduct}
          editingProduct={editingProduct}
          clearEditing={() => setEditingProduct(null)}
        />
      </div>

      <ProductTable
        products={data.products}
        onEdit={(p) => setEditingProduct(p)}
        onDelete={deleteProduct}
      />
    </div>
  )
}
