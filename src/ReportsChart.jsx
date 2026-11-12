import React from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

export default function ReportsChart({ data, formatValue }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <CartesianGrid stroke="#263044" strokeDasharray="4 4" />
        <XAxis dataKey="month" tick={{ fill: '#8290a8', fontSize: 11 }} />
        <YAxis tick={{ fill: '#8290a8', fontSize: 10 }} />
        <Tooltip formatter={value => formatValue(value)} />
        <Area dataKey="Entradas" stroke="#35d39a" fill="#35d39a" fillOpacity={0.12} />
        <Area dataKey="Gastos" stroke="#ff7085" fill="#ff7085" fillOpacity={0.12} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
