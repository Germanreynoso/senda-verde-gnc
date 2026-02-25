import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import UserForm from '../components/users/UserForm'
import UserTable from '../components/users/UserTable'

export default function UsersPage() {
  const { data, saveUser, deleteUser } = useData()
  const [editingUser, setEditingUser] = useState(null)

  return (
    <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 tracking-tight">Gestión de Usuarios</h2>
      <div className="mb-8 p-6 bg-emerald-500/5 dark:bg-white/5 rounded-2xl border border-emerald-200/20 dark:border-white/10">
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
