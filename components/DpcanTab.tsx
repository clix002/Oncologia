"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { DpcanPorRegion } from "@/lib/types";

interface DpcanTabProps {
	datos: DpcanPorRegion[];
	departamento: string;
}

const TIPO_COLORS: Record<string, string> = {
	"Mama": "#f78166",
	"Cuello Uterino": "#d2a8ff",
	"Colon-Recto": "#79c0ff",
	"Próstata": "#56d364",
};

export default function DpcanTab({ datos, departamento }: DpcanTabProps) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const isDark = !mounted || resolvedTheme === "dark";
	const tooltipBg = isDark ? "#161b22" : "#ffffff";
	const tooltipBorder = isDark ? "#30363d" : "#d0d7de";
	const tooltipColor = isDark ? "#e6edf3" : "#1f2328";
	const gridColor = isDark ? "#30363d" : "#d0d7de";
	const axisColor = isDark ? "#7d8590" : "#656d76";

	if (!datos || datos.length === 0) {
		return (
			<p className="text-sm text-muted-foreground font-mono py-6 text-center">
				Sin datos DPCAN disponibles para {departamento}
			</p>
		);
	}

	// Pivot: año → { Mama, CuelloUterino, ... }
	const tipos = [...new Set(datos.map((d) => d.tipo_cancer))];
	const años = [...new Set(datos.map((d) => d.año))].sort();

	const chartData = años.map((año) => {
		const entry: Record<string, number | string> = { año: String(año) };
		for (const tipo of tipos) {
			const row = datos.find((d) => d.año === año && d.tipo_cancer === tipo);
			entry[tipo] = row?.cobertura_pct ?? 0;
		}
		return entry;
	});

	// Resumen último año disponible
	const ultimoAño = años[años.length - 1];
	const resumen = tipos.map((tipo) => {
		const row = datos.find((d) => d.año === ultimoAño && d.tipo_cancer === tipo);
		return { tipo, num: row?.num ?? 0, den: row?.den ?? 0, cobertura_pct: row?.cobertura_pct ?? 0 };
	});

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-sm font-mono text-muted-foreground mb-1 uppercase tracking-wider">
					Tamizaje oncológico — {departamento}
				</h3>
				<p className="text-xs text-muted-foreground mb-4">
					Cobertura de detección temprana por tipo de cáncer (Fuente: DPCAN-MINSA).
					Muestra qué porcentaje de la población objetivo fue tamizada cada año.
				</p>

				{/* Gráfico líneas — cobertura % por año */}
				<div className="h-[260px]">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
							<XAxis
								dataKey="año"
								tick={{ fontSize: 11, fill: axisColor, fontFamily: "monospace" }}
								axisLine={false}
								tickLine={false}
							/>
							<YAxis
								tick={{ fontSize: 11, fill: axisColor, fontFamily: "monospace" }}
								axisLine={false}
								tickLine={false}
								tickFormatter={(v) => `${v}%`}
								width={40}
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
								formatter={(value) => [`${value}%`, ""]}
								labelFormatter={(label) => `Año ${label}`}
							/>
							<Legend
								wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }}
							/>
							{tipos.map((tipo) => (
								<Line
									key={tipo}
									dataKey={tipo}
									stroke={TIPO_COLORS[tipo] ?? "#7d8590"}
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
								/>
							))}
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Resumen último año */}
			<div>
				<h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
					Resumen {ultimoAño}
				</h4>
				<div className="grid grid-cols-2 gap-3">
					{resumen.map((r) => (
						<div
							key={r.tipo}
							className="rounded-md border border-border p-3 space-y-1"
						>
							<div className="flex items-center gap-2">
								<span
									className="inline-block w-2 h-2 rounded-full shrink-0"
									style={{ backgroundColor: TIPO_COLORS[r.tipo] ?? "#7d8590" }}
								/>
								<span className="text-xs font-mono text-foreground font-semibold">{r.tipo}</span>
							</div>
							<p className="text-lg font-mono font-bold text-foreground">
								{r.cobertura_pct}%
								<span className="text-xs font-normal text-muted-foreground ml-1">cobertura</span>
							</p>
							<p className="text-[10px] text-muted-foreground font-mono">
								{r.num.toLocaleString()} detectados / {r.den.toLocaleString()} tamizados
							</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
