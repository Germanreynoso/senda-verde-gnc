import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import UserForm from '../components/users/UserForm'
import UserTable from '../components/users/UserTable'

export default function UsersPage() {
  const { data, saveUser, deleteUser } = useData()
  const [editingUser, setEditingUser] = useState(null)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Usuarios</h2>
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <UserForm
          onSave={saveUser}
          editingUser={editingUser}
          clearEditing={() => setEditingUser(null)}
        />
      </div>

      <UserTable
        users={data.users}
        onEdit={(u) => setEditingUser(u)}
        onDelete={deleteUser}
      />
    </div>
  )
}
