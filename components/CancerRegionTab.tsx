"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { CancerPorRegion } from "@/lib/types";

interface CancerRegionTabProps {
	datos: CancerPorRegion[];
	departamento: string;
}

const COLORS = [
	"#f78166", "#d2a8ff", "#79c0ff", "#56d364", "#e3b341",
	"#ff7b72", "#bc8cff", "#58a6ff", "#3fb950", "#d29922",
	"#ffa198", "#cae8ff", "#b3f0bc", "#ffe68a", "#c9d1d9",
];

export default function CancerRegionTab({ datos, departamento }: CancerRegionTabProps) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const isDark = !mounted || resolvedTheme === "dark";
	const tooltipBg = isDark ? "#161b22" : "#ffffff";
	const tooltipBorder = isDark ? "#30363d" : "#d0d7de";
	const tooltipColor = isDark ? "#e6edf3" : "#1f2328";
	const gridColor = isDark ? "#30363d" : "#d0d7de";
	const axisColor = isDark ? "#7d8590" : "#656d76";
	const labelColor = isDark ? "#e6edf3" : "#1f2328";

	if (!datos || datos.length === 0) {
		return (
			<p className="text-sm text-muted-foreground font-mono py-6 text-center">
				Sin datos disponibles para {departamento}
			</p>
		);
	}

	const total = datos.reduce((s, d) => s + d.casos, 0);

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-sm font-mono text-muted-foreground mb-1 uppercase tracking-wider">
					Tipos de cáncer más frecuentes — {departamento}
				</h3>
				<p className="text-xs text-muted-foreground mb-4">
					Top 15 diagnósticos oncológicos registrados en el INEN para esta región.
				</p>

				{/* Gráfico horizontal */}
				<div style={{ height: datos.length * 36 + 40 }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={datos}
							layout="vertical"
							margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
							<XAxis
								type="number"
								tick={{ fill: axisColor, fontSize: 11, fontFamily: "monospace" }}
								axisLine={false}
								tickLine={false}
								tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
							/>
							<YAxis
								type="category"
								dataKey="tipo"
								width={140}
								tick={{ fill: labelColor, fontSize: 11, fontFamily: "monospace" }}
								axisLine={false}
								tickLine={false}
							/>
							<Tooltip
								contentStyle={{
									background: tooltipBg,
									border: `1px solid ${tooltipBorder}`,
									borderRadius: 6,
									fontSize: 12,
									fontFamily: "monospace",
									color: tooltipColor,
								}}
								formatter={(value, _name, props) => {
									const n = Number(value ?? 0);
									return [
										`${n.toLocaleString()} atenciones (${((n / total) * 100).toFixed(1)}%)`,
										props.payload?.tipo,
									];
								}}
								labelFormatter={() => ""}
							/>
							<Bar dataKey="casos" radius={[0, 4, 4, 0]} maxBarSize={24}>
								{datos.map((_, i) => (
									<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Tabla resumen */}
			<div className="divide-y divide-border rounded-md border border-border overflow-hidden">
				<div className="grid grid-cols-12 px-3 py-2 bg-muted/30 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
					<span className="col-span-1">#</span>
					<span className="col-span-7">Tipo de cáncer</span>
					<span className="col-span-2 text-right">Casos</span>
					<span className="col-span-2 text-right">% del total</span>
				</div>
				{datos.map((d, i) => (
					<div key={d.cod_cie10} className="grid grid-cols-12 px-3 py-2 text-xs font-mono hover:bg-muted/20 transition-colors">
						<span className="col-span-1 text-muted-foreground">{i + 1}</span>
						<div className="col-span-7 flex items-center gap-2">
							<span
								className="inline-block w-2 h-2 rounded-full shrink-0"
								style={{ backgroundColor: COLORS[i % COLORS.length] }}
							/>
							<span className="text-foreground">{d.tipo}</span>
							<span className="text-muted-foreground text-[10px]">({d.cod_cie10})</span>
						</div>
						<span className="col-span-2 text-right text-foreground">{d.casos.toLocaleString()}</span>
						<span className="col-span-2 text-right text-muted-foreground">
							{((d.casos / total) * 100).toFixed(1)}%
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
