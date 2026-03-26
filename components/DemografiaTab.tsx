"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { DistribucionEdad, DistribucionSexo } from "@/lib/types";

interface DemografiaTabProps {
	sexo: DistribucionSexo[];
	edad: DistribucionEdad[];
	departamento: string;
}

const SEX_COLORS: Record<string, string> = {
	FEMENINO: "#f78166",
	MASCULINO: "#58a6ff",
};

export default function DemografiaTab({
	sexo,
	edad,
	departamento,
}: DemografiaTabProps) {
	const totalSexo = sexo.reduce((s, r) => s + r.casos, 0);
	const pieData = sexo.map((s) => ({
		name: s.sexo,
		value: s.casos,
		pct: totalSexo > 0 ? Math.round((s.casos / totalSexo) * 100) : 0,
	}));

	const edadData = edad.map((e) => ({
		name: e.grupo_etario,
		casos: e.casos,
	}));

	return (
		<div className="space-y-6">
			{/* Sexo */}
			<div>
				<h3 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
					Distribución por sexo — {departamento}
				</h3>
				<div className="flex items-center gap-6">
					<div className="h-[160px] w-[160px]">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={pieData}
									cx="50%"
									cy="50%"
									innerRadius={40}
									outerRadius={70}
									dataKey="value"
									strokeWidth={0}
								>
									{pieData.map((entry) => (
										<Cell
											key={entry.name}
											fill={SEX_COLORS[entry.name] || "#7d8590"}
										/>
									))}
								</Pie>
							</PieChart>
						</ResponsiveContainer>
					</div>
					<div className="space-y-2">
						{pieData.map((s) => (
							<div key={s.name} className="flex items-center gap-2">
								<div
									className="w-3 h-3 rounded-full"
									style={{
										backgroundColor: SEX_COLORS[s.name] || "#7d8590",
									}}
								/>
								<span className="text-sm text-foreground">{s.name}</span>
								<span className="text-sm font-mono text-muted-foreground">
									{s.value.toLocaleString()} ({s.pct}%)
								</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Grupos etarios */}
			{edadData.length > 0 && (
				<div>
					<h3 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
						Distribución por grupo etario
					</h3>
					<div className="h-[240px]">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={edadData} layout="vertical">
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#30363d"
									horizontal={false}
								/>
								<XAxis
									type="number"
									tick={{ fill: "#7d8590", fontSize: 12 }}
									axisLine={{ stroke: "#30363d" }}
								/>
								<YAxis
									type="category"
									dataKey="name"
									tick={{ fill: "#7d8590", fontSize: 11 }}
									axisLine={{ stroke: "#30363d" }}
									width={60}
								/>
								<Tooltip
									contentStyle={{
										background: "#161b22",
										border: "1px solid #30363d",
										borderRadius: 6,
										color: "#e6edf3",
										fontSize: 13,
									}}
								/>
								<Bar
									dataKey="casos"
									fill="#d29922"
									radius={[0, 4, 4, 0]}
									maxBarSize={24}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}
		</div>
	);
}
