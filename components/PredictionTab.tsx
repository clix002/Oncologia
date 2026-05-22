"use client";

import { useMemo, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { CasosPorAnio, CasosPorAnioFuente, TasaMortalidad } from "@/lib/types";

interface PredictionTabProps {
	porAnio: CasosPorAnio[];
	porFuente: CasosPorAnioFuente[];
	departamento: string;
	tasasMortalidad?: TasaMortalidad[];
}

interface ForecastPoint {
	año: number;
	casos: number | null;
	prediccion: number;
	intervalo_inf: number;
	intervalo_sup: number;
	banda: [number, number]; // para Area de recharts
	es_futuro: boolean;
}

function linearForecast(data: CasosPorAnio[], horizonte = 3): {
	points: ForecastPoint[];
	pendiente: number;
	r2: number;
	tendencia: "creciente" | "decreciente" | "estable";
} {
	if (data.length < 2) return { points: [], pendiente: 0, r2: 0, tendencia: "estable" };

	const n = data.length;
	const xs = data.map((d) => d.año);
	const ys = data.map((d) => d.casos);
	const xMean = xs.reduce((a, b) => a + b, 0) / n;
	const yMean = ys.reduce((a, b) => a + b, 0) / n;

	const ssXY = xs.reduce((acc, x, i) => acc + (x - xMean) * (ys[i] - yMean), 0);
	const ssXX = xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0);
	const ssYY = ys.reduce((acc, y) => acc + (y - yMean) ** 2, 0);

	const pendiente = ssXX === 0 ? 0 : ssXY / ssXX;
	const intercepto = yMean - pendiente * xMean;
	const r2 = ssXX === 0 || ssYY === 0 ? 0 : (ssXY ** 2) / (ssXX * ssYY);

	const residuals = ys.map((y, i) => y - (pendiente * xs[i] + intercepto));
	const mse = residuals.reduce((a, b) => a + b ** 2, 0) / Math.max(n - 2, 1);
	const se = Math.sqrt(mse);
	const margin = 1.96 * se;

	const maxAnio = Math.max(...xs);
	const futureYears = Array.from({ length: horizonte }, (_, i) => maxAnio + i + 1);

	const historical: ForecastPoint[] = data.map((d) => ({
		año: d.año,
		casos: d.casos,
		prediccion: Math.round(pendiente * d.año + intercepto),
		intervalo_inf: Math.round(Math.max(0, pendiente * d.año + intercepto - margin)),
		intervalo_sup: Math.round(pendiente * d.año + intercepto + margin),
		banda: [
			Math.round(Math.max(0, pendiente * d.año + intercepto - margin)),
			Math.round(pendiente * d.año + intercepto + margin),
		],
		es_futuro: false,
	}));

	const future: ForecastPoint[] = futureYears.map((año) => ({
		año,
		casos: null,
		prediccion: Math.round(pendiente * año + intercepto),
		intervalo_inf: Math.round(Math.max(0, pendiente * año + intercepto - margin)),
		intervalo_sup: Math.round(pendiente * año + intercepto + margin),
		banda: [
			Math.round(Math.max(0, pendiente * año + intercepto - margin)),
			Math.round(pendiente * año + intercepto + margin),
		],
		es_futuro: true,
	}));

	const tendencia =
		Math.abs(pendiente) < 1 ? "estable" : pendiente > 0 ? "creciente" : "decreciente";

	return { points: [...historical, ...future], pendiente, r2, tendencia };
}

// Colores semánticos — verde=real, naranja=forecast, banda azul suave
const COLOR_REAL      = "#3fb950"; // verde
const COLOR_FORECAST  = "#f78166"; // naranja/rojo
const COLOR_BANDA     = "#58a6ff"; // azul

const TENDENCIA_META: Record<string, { color: string; icon: string; label: string; desc: string }> = {
	creciente:  { color: "#f78166", icon: "↑", label: "Creciente",  desc: "Los casos aumentan año a año" },
	decreciente:{ color: "#3fb950", icon: "↓", label: "Decreciente",desc: "Los casos disminuyen año a año" },
	estable:    { color: "#58a6ff", icon: "→", label: "Estable",    desc: "Sin cambio significativo" },
};

export default function PredictionTab({ porAnio, porFuente, departamento, tasasMortalidad }: PredictionTabProps) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const dark = mounted ? resolvedTheme === "dark" : true;
	const axisColor   = dark ? "#7d8590" : "#6b7280";
	const gridColor   = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
	const tooltipBg   = dark ? "#0d1117" : "#ffffff";
	const tooltipBorder = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

	// Preferir serie de tasas (2000-2024, 25pts, alta R²) sobre porAnio mezclado
	const tasasSerie: CasosPorAnio[] = useMemo(() => {
		if (!tasasMortalidad || tasasMortalidad.length === 0) return [];
		return tasasMortalidad
			.filter((t) => t.sexo === "Total")
			.map((t) => ({ año: t.año, casos: t.ndefun }))
			.sort((a, b) => a.año - b.año);
	}, [tasasMortalidad]);

	const usandoTasas = tasasSerie.length >= 5;
	const serieActiva: CasosPorAnio[] = usandoTasas ? tasasSerie : porAnio;
	const labelCasos = usandoTasas ? "Defunciones" : "Casos";

	// Detectar si la serie mezcla fuentes distintas (solo relevante cuando NO usamos tasas)
	const fuentes = useMemo(() => {
		const set = new Set(porFuente.map((p) => p.fuente));
		return Array.from(set);
	}, [porFuente]);
	const mezclaDeFuentes = !usandoTasas && fuentes.length > 1;

	const { points, pendiente, r2, tendencia } = useMemo(
		() => linearForecast(serieActiva, 3),
		[serieActiva]
	);

	if (points.length === 0) {
		return (
			<p className="text-sm text-muted-foreground font-mono">
				Datos insuficientes para calcular predicciones.
			</p>
		);
	}

	const meta = TENDENCIA_META[tendencia];
	const futurePoints = points.filter((p) => p.es_futuro);
	const splitX = futurePoints[0]?.año;

	return (
		<div className="space-y-4">
			{/* ── Advertencia de mezcla de fuentes ── */}
			{mezclaDeFuentes && (
				<div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
					<span className="text-yellow-500 text-sm shrink-0">⚠</span>
					<p className="text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
						<strong>Serie mezclada:</strong> los datos combinan{" "}
						{fuentes.join(" + ")}. Las fuentes miden cosas distintas
						(atenciones ≠ defunciones), lo que reduce la precisión del forecast.
					</p>
				</div>
			)}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{/* Tendencia */}
				<Card style={{ borderColor: meta.color + "55" }}>
					<CardContent className="pt-4 pb-3 px-4">
						<p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Tendencia</p>
						<div className="flex items-center gap-1.5">
							<span className="text-lg font-bold" style={{ color: meta.color }}>{meta.icon}</span>
							<span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
						</div>
						<p className="text-[10px] text-muted-foreground mt-1">{meta.desc}</p>
					</CardContent>
				</Card>

				{/* Crecimiento */}
				<Card>
					<CardContent className="pt-4 pb-3 px-4">
						<p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Crecimiento</p>
						<p className="text-sm font-mono font-semibold text-foreground">
							{pendiente > 0 ? "+" : ""}{pendiente.toFixed(0)}
							<span className="text-xs font-normal text-muted-foreground ml-1">{labelCasos.toLowerCase()}/año</span>
						</p>
						<p className="text-[10px] text-muted-foreground mt-1">promedio histórico</p>
					</CardContent>
				</Card>

				{/* Próximo año */}
				<Card style={{ borderColor: COLOR_FORECAST + "55" }}>
					<CardContent className="pt-4 pb-3 px-4">
						<p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">
							{futurePoints[0]?.año ?? "—"}
						</p>
						<p className="text-sm font-mono font-semibold" style={{ color: COLOR_FORECAST }}>
							~{futurePoints[0]?.prediccion.toLocaleString()}
							<span className="text-xs font-normal text-muted-foreground ml-1">{labelCasos.toLowerCase()}</span>
						</p>
						<p className="text-[10px] text-muted-foreground mt-1">proyección estimada</p>
					</CardContent>
				</Card>

				{/* Confianza */}
				<Card>
					<CardContent className="pt-4 pb-3 px-4">
						<p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Confianza del modelo</p>
						<p className="text-sm font-mono font-semibold text-foreground">
							{(r2 * 100).toFixed(0)}%
						</p>
						<p className="text-[10px] text-muted-foreground mt-1">
							{r2 > 0.7 ? "tendencia clara" : r2 > 0.4 ? "tendencia moderada" : "datos muy variables"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* ── Gráfico ── */}
			<Card>
				<CardHeader className="pb-1 pt-4 px-4">
					<CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
						{labelCasos} históricos + proyección · {departamento}
					</CardTitle>
					{/* Badge fuente */}
					{usandoTasas && (
						<Badge variant="outline" className="w-fit text-[10px] font-mono mt-1">
							Fuente: MINSA-SINADEF 2000–2024
						</Badge>
					)}
					{/* Leyenda manual */}
					<div className="flex items-center gap-4 mt-1">
						<LegendDot color={COLOR_REAL} label={labelCasos} />
						<LegendDot color={COLOR_FORECAST} label="Predicción" dashed />
						<LegendDot color={COLOR_BANDA} label="Intervalo 95%" area />
					</div>
				</CardHeader>
				<CardContent className="px-2 pb-3">
					<ResponsiveContainer width="100%" height={280}>
						<ComposedChart data={points} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
							<CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
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
								width={50}
								tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
							/>
							<Tooltip
								contentStyle={{
									background: tooltipBg,
									border: `1px solid ${tooltipBorder}`,
									borderRadius: 8,
									fontSize: 12,
									fontFamily: "monospace",
								}}
								formatter={(value, name) => {
									if (value == null) return ["—", String(name)];
									const n = Number(value);
									if (name === "intervalo_inf") return [n.toLocaleString(), "IC mínimo"];
									if (name === "intervalo_sup") return [n.toLocaleString(), "IC máximo"];
									if (name === "Casos reales" || name === labelCasos) return [n.toLocaleString(), labelCasos];
									return [n.toLocaleString(), String(name)];
								}}
								labelFormatter={(label) => `Año ${label}`}
							/>

							{/* Banda de confianza — solo años futuros */}
							<Area
								dataKey="intervalo_sup"
								stroke="transparent"
								fill={COLOR_BANDA}
								fillOpacity={0.12}
								legendType="none"
								name="intervalo_sup"
								activeDot={false}
							/>
							<Area
								dataKey="intervalo_inf"
								stroke="transparent"
								fill={tooltipBg}
								fillOpacity={1}
								legendType="none"
								name="intervalo_inf"
								activeDot={false}
							/>

							{/* Línea histórica — verde */}
							<Line
								dataKey="casos"
								name={labelCasos}
								stroke={COLOR_REAL}
								strokeWidth={2.5}
								dot={(props) => {
									if (props.payload?.casos == null) return <g key={props.key} />;
									return (
										<circle
											key={props.key}
											cx={props.cx} cy={props.cy} r={4}
											fill={COLOR_REAL} stroke={tooltipBg} strokeWidth={2}
										/>
									);
								}}
								connectNulls={false}
								activeDot={{ r: 5, fill: COLOR_REAL }}
							/>

							{/* Línea de predicción — naranja, punteada */}
							<Line
								dataKey="prediccion"
								name="Predicción"
								stroke={COLOR_FORECAST}
								strokeWidth={2}
								strokeDasharray="6 3"
								dot={(props) => {
									if (!props.payload?.es_futuro) return <g key={props.key} />;
									return (
										<circle
											key={props.key}
											cx={props.cx} cy={props.cy} r={5}
											fill={COLOR_FORECAST} stroke={tooltipBg} strokeWidth={2}
										/>
									);
								}}
								activeDot={{ r: 5, fill: COLOR_FORECAST }}
							/>

							{/* Separador histórico / forecast */}
							{splitX && (
								<ReferenceLine
									x={splitX}
									stroke={COLOR_FORECAST}
									strokeDasharray="4 3"
									strokeOpacity={0.5}
									label={{
										value: "↑ proyección",
										position: "insideTopRight",
										fontSize: 10,
										fill: COLOR_FORECAST,
										fontFamily: "monospace",
									}}
								/>
							)}
						</ComposedChart>
					</ResponsiveContainer>
				</CardContent>
			</Card>

			{/* ── Tabla de estimaciones ── */}
			<Card>
				<CardHeader className="pb-2 pt-4 px-4">
					<CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
						Estimaciones {futurePoints[0]?.año}–{futurePoints.at(-1)?.año}
					</CardTitle>
				</CardHeader>
				<CardContent className="px-4 pb-4">
					<div className="divide-y divide-border">
						{futurePoints.map((p, i) => (
							<div key={p.año} className="flex items-center gap-3 py-3">
								<div
									className="w-1 h-8 rounded-full shrink-0"
									style={{ backgroundColor: COLOR_FORECAST, opacity: 1 - i * 0.2 }}
								/>
								<div className="flex-1">
									<p className="font-mono text-xs text-muted-foreground">{p.año}</p>
									<p className="font-mono font-bold text-base text-foreground">
										~{p.prediccion.toLocaleString()}
										<span className="text-xs font-normal text-muted-foreground ml-1">{labelCasos.toLowerCase()}</span>
									</p>
								</div>
								<div className="text-right">
									<p className="text-[10px] text-muted-foreground font-mono">intervalo 95%</p>
									<p className="text-xs font-mono" style={{ color: COLOR_BANDA }}>
										{p.intervalo_inf.toLocaleString()} – {p.intervalo_sup.toLocaleString()}
									</p>
								</div>
							</div>
						))}
					</div>
				<p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
					Esta proyección usa defunciones oncológicas registradas por el MINSA-SINADEF (2000–2024).
					El aumento proyectado refleja el crecimiento poblacional y el envejecimiento, que elevan la incidencia de cáncer a nivel nacional.
					El intervalo 95% indica el rango probable — cuanto más amplio, más incierta la estimación.
				</p>
				</CardContent>
			</Card>
		</div>
	);
}

function LegendDot({
	color, label, dashed = false, area = false,
}: {
	color: string; label: string; dashed?: boolean; area?: boolean;
}) {
	return (
		<div className="flex items-center gap-1.5">
			{area ? (
				<div className="w-8 h-3 rounded" style={{ backgroundColor: color, opacity: 0.3 }} />
			) : dashed ? (
				<svg width="24" height="2" className="shrink-0">
					<line x1="0" y1="1" x2="24" y2="1" stroke={color} strokeWidth="2" strokeDasharray="5 3" />
				</svg>
			) : (
				<div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
			)}
			<span className="text-[10px] text-muted-foreground font-mono">{label}</span>
		</div>
	);
}
