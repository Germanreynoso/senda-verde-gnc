import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import ProductForm from '../components/products/ProductForm'
import ProductTable from '../components/products/ProductTable'

export default function ProductsPage() {
  const { data, saveProduct, deleteProduct } = useData()
  const [editingProduct, setEditingProduct] = useState(null)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Productos</h2>
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
