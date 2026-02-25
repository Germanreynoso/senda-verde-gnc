import React from 'react'
import { useData } from '../context/DataContext'
import SalesChart from '../components/Dashboard/SalesChart'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const { data } = useData()

  const stats = [
    { label: 'Total Usuarios', value: data.users.length, color: 'blue' },
    { label: 'Total Productos', value: data.products.length, color: 'emerald' },
    { label: 'Turnos Registrados', value: data.shifts.length, color: 'violet' },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl shadow-xl p-8 transition-all duration-300">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 tracking-tight">Resumen del Sistema</h2>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              variants={item}
              className={`bg-${stat.color}-500/10 dark:bg-${stat.color}-500/20 p-6 rounded-2xl border border-${stat.color}-200/50 dark:border-${stat.color}-500/20 backdrop-blur-sm transition-transform hover:scale-105 cursor-default`}
            >
              <p className={`text-sm font-medium text-${stat.color}-600 dark:text-${stat.color}-400 uppercase tracking-wider`}>{stat.label}</p>
              <p className={`text-4xl font-bold text-${stat.color}-700 dark:text-${stat.color}-300 mt-2`}>{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <SalesChart shifts={data.shifts} pricePerCubicMeter={data.pricePerCubicMeter} />
      </div>
    </div>
  )
}
