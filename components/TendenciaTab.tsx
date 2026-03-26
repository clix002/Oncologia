"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { CasosPorAnio, TendenciaMensual } from "@/lib/types";

interface TendenciaTabProps {
	porAnio: CasosPorAnio[];
	mensual: TendenciaMensual[];
	departamento: string;
}

const MESES = [
	"Ene",
	"Feb",
	"Mar",
	"Abr",
	"May",
	"Jun",
	"Jul",
	"Ago",
	"Sep",
	"Oct",
	"Nov",
	"Dic",
];

export default function TendenciaTab({
	porAnio,
	mensual,
	departamento,
}: TendenciaTabProps) {
	const barData = porAnio.map((d) => ({
		name: String(d.año),
		casos: d.casos,
	}));

	const heatData = mensual.map((d) => ({
		name: MESES[d.mes - 1] || `M${d.mes}`,
		casos: d.casos,
	}));

	return (
		<div className="space-y-6">
			{/* Casos por año */}
			<div>
				<h3 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
					Casos por año — {departamento}
				</h3>
				<div className="h-[240px]">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={barData}>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="#30363d"
								vertical={false}
							/>
							<XAxis
								dataKey="name"
								tick={{ fill: "#7d8590", fontSize: 12 }}
								axisLine={{ stroke: "#30363d" }}
							/>
							<YAxis
								tick={{ fill: "#7d8590", fontSize: 12 }}
								axisLine={{ stroke: "#30363d" }}
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
								fill="#f78166"
								radius={[4, 4, 0, 0]}
								maxBarSize={48}
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Tendencia mensual */}
			{heatData.length > 0 && (
				<div>
					<h3 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
						Distribución mensual
					</h3>
					<div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
						{heatData.map((m) => {
							const max = Math.max(...heatData.map((h) => h.casos), 1);
							const intensity = m.casos / max;
							return (
								<div key={m.name} className="flex flex-col items-center gap-1">
									<div
										className="w-full aspect-square rounded-sm flex items-center justify-center text-xs font-mono"
										style={{
											backgroundColor: `rgba(247, 129, 102, ${0.1 + intensity * 0.8})`,
											color: intensity > 0.5 ? "#0d1117" : "#e6edf3",
										}}
									>
										{m.casos}
									</div>
									<span className="text-[10px] text-muted-foreground">
										{m.name}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
