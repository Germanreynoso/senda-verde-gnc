import React from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { formatDate } from '../../utils/format'

export default function SalesChart({ shifts = [], pricePerCubicMeter }) {
    if (!shifts || shifts.length === 0) return null;

    const chartData = [...shifts].reverse().slice(-7).map((shift) => {
        const totalSurt = (shift.surtidores || []).reduce((sum, s) => {
            const vendido = (parseFloat(s.lecturaFinal) || 0) - (parseFloat(s.lecturaInicial) || 0)
            return sum + vendido * pricePerCubicMeter
        }, 0)
        const totalProd = (shift.ventas || []).reduce((sum, v) => sum + v.total, 0)

        return {
            name: formatDate(shift.fecha).split(',')[0],
            total: totalSurt + totalProd,
        }
    })

    return (
        <div style={{ width: '100%', height: 300, minHeight: 300 }} className="mt-8">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Ventas de los Últimos Turnos</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
