"use client";

// WHY: Charts in a clinical BI context should feel like instrument readouts,
// not business dashboards. Minimal chrome, precise data, quiet authority.

import { useTheme } from "next-themes";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export interface GraficaData {
	tipo: "bar" | "line" | "pie" | "area" | null;
	titulo: string;
	datos: { nombre: string; valor: number }[];
	ejeX: string;
	ejeY: string;
}

interface Props {
	grafica: GraficaData | null;
}

// Medical domain palette: same in both themes — these are data colors, not chrome
const MEDICAL_PALETTE = [
	"#c0392b",
	"#d68910",
	"#2e86c1",
	"#1e8449",
	"#7d3c98",
	"#b7950b",
	"#1a5276",
	"#922b21",
];

function useChartTokens(resolvedTheme: string | undefined) {
	const dark = resolvedTheme === "dark";
	return {
		chartBg:       dark ? "#161b22" : "#f8f9fa",
		chartBorder:   dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
		titleColor:    dark ? "#c8c4ba" : "#1a1a2e",
		axisColor:     dark ? "#7d8590" : "#6b7280",
		gridStroke:    dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)",
		axisLineStroke:dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.12)",
		tooltipBg:     dark ? "#0d1117" : "#ffffff",
		tooltipBorder: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
		tooltipText:   dark ? "#e6edf3" : "#1a1a2e",
		tooltipLabel:  dark ? "#7d8590" : "#6b7280",
		legendText:    dark ? "#7d8590" : "#6b7280",
		accentStroke:  "#e84c3d",
		dotBg:         dark ? "#161b22" : "#ffffff",
	};
}

function ChartShell({
	titulo,
	children,
	tokens,
}: {
	titulo: string;
	children: React.ReactNode;
	tokens: ReturnType<typeof useChartTokens>;
}) {
	return (
		<div
			style={{
				background: tokens.chartBg,
				border: `1px solid ${tokens.chartBorder}`,
				borderRadius: "10px",
				padding: "20px 16px 16px",
				marginTop: "12px",
				position: "relative",
				overflow: "hidden",
			}}
		>
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					bottom: 0,
					width: "2px",
					background: "linear-gradient(180deg, #e84c3d 0%, transparent 100%)",
					borderRadius: "2px 0 0 2px",
				}}
			/>
			<div style={{ marginBottom: "16px", paddingLeft: "4px" }}>
				<p
					style={{
						fontFamily: "Georgia, serif",
						fontSize: "13px",
						fontWeight: 600,
						color: tokens.titleColor,
						lineHeight: 1.3,
						letterSpacing: "0.01em",
					}}
				>
					{titulo}
				</p>
			</div>
			{children}
		</div>
	);
}

export default function ChartRenderer({ grafica }: Props) {
	const { resolvedTheme } = useTheme();
	const t = useChartTokens(resolvedTheme);

	if (!grafica?.tipo || !grafica.datos || grafica.datos.length === 0) {
		return null;
	}

	const { tipo, titulo, datos, ejeX, ejeY } = grafica;

	const tooltipStyle = {
		backgroundColor: t.tooltipBg,
		border: `1px solid ${t.tooltipBorder}`,
		borderRadius: "6px",
		color: t.tooltipText,
		fontSize: "12px",
		padding: "8px 12px",
		fontFamily: '"Courier New", monospace',
		letterSpacing: "0.03em",
		boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
	};

	const axisStyle = {
		fill: t.axisColor,
		fontSize: 11,
		fontFamily: '"Courier New", monospace',
	};

	const axisLabelStyle = {
		fill: t.axisColor,
		fontSize: 10,
		fontFamily: '"Courier New", monospace',
		letterSpacing: "0.06em" as const,
	};

	const commonAxisProps = {
		tick: axisStyle,
		tickLine: false as const,
	};

	const xAxisLabel = {
		value: ejeX,
		position: "insideBottom" as const,
		offset: -24,
		...axisLabelStyle,
	};

	const yAxisLabel = {
		value: ejeY,
		angle: -90 as const,
		position: "insideLeft" as const,
		offset: 16,
		...axisLabelStyle,
	};

	if (tipo === "bar") {
		return (
			<ChartShell titulo={titulo} tokens={t}>
				<ResponsiveContainer width="100%" height={280}>
					<BarChart data={datos} margin={{ top: 4, right: 12, left: -8, bottom: 36 }}>
						<CartesianGrid strokeDasharray="2 4" stroke={t.gridStroke} vertical={false} />
						<XAxis
							dataKey="nombre"
							{...commonAxisProps}
							axisLine={{ stroke: t.axisLineStroke }}
							label={xAxisLabel}
						/>
						<YAxis
							{...commonAxisProps}
							axisLine={false}
							label={yAxisLabel}
						/>
						<Tooltip
							contentStyle={tooltipStyle}
							cursor={{ fill: "rgba(232,76,61,0.06)" }}
							labelStyle={{ color: t.tooltipLabel, fontFamily: '"Courier New", monospace', fontSize: "11px", marginBottom: "4px" }}
							itemStyle={{ color: t.tooltipText }}
						/>
						<Bar dataKey="valor" fill="#c0392b" radius={[3, 3, 0, 0]} maxBarSize={48} opacity={0.9} />
					</BarChart>
				</ResponsiveContainer>
			</ChartShell>
		);
	}

	if (tipo === "line") {
		return (
			<ChartShell titulo={titulo} tokens={t}>
				<ResponsiveContainer width="100%" height={280}>
					<LineChart data={datos} margin={{ top: 4, right: 12, left: -8, bottom: 36 }}>
						<CartesianGrid strokeDasharray="2 4" stroke={t.gridStroke} vertical={false} />
						<XAxis
							dataKey="nombre"
							{...commonAxisProps}
							axisLine={{ stroke: t.axisLineStroke }}
							label={xAxisLabel}
						/>
						<YAxis {...commonAxisProps} axisLine={false} label={yAxisLabel} />
						<Tooltip
							contentStyle={tooltipStyle}
							cursor={{ stroke: "rgba(232,76,61,0.2)", strokeWidth: 1 }}
							labelStyle={{ color: t.tooltipLabel, fontFamily: '"Courier New", monospace', fontSize: "11px", marginBottom: "4px" }}
							itemStyle={{ color: t.tooltipText }}
						/>
						<Line
							type="monotone"
							dataKey="valor"
							stroke={t.accentStroke}
							strokeWidth={2}
							dot={{ fill: t.dotBg, stroke: t.accentStroke, strokeWidth: 2, r: 3 }}
							activeDot={{ r: 5, fill: t.accentStroke, stroke: t.dotBg, strokeWidth: 2 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</ChartShell>
		);
	}

	if (tipo === "area") {
		return (
			<ChartShell titulo={titulo} tokens={t}>
				<ResponsiveContainer width="100%" height={280}>
					<AreaChart data={datos} margin={{ top: 4, right: 12, left: -8, bottom: 36 }}>
						<defs>
							<linearGradient id="onco-area-grad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#e84c3d" stopOpacity={0.22} />
								<stop offset="75%" stopColor="#e84c3d" stopOpacity={0.03} />
								<stop offset="100%" stopColor="#e84c3d" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="2 4" stroke={t.gridStroke} vertical={false} />
						<XAxis
							dataKey="nombre"
							{...commonAxisProps}
							axisLine={{ stroke: t.axisLineStroke }}
							label={xAxisLabel}
						/>
						<YAxis {...commonAxisProps} axisLine={false} label={yAxisLabel} />
						<Tooltip
							contentStyle={tooltipStyle}
							cursor={{ stroke: "rgba(232,76,61,0.2)", strokeWidth: 1 }}
							labelStyle={{ color: t.tooltipLabel, fontFamily: '"Courier New", monospace', fontSize: "11px", marginBottom: "4px" }}
							itemStyle={{ color: t.tooltipText }}
						/>
						<Area
							type="monotone"
							dataKey="valor"
							stroke={t.accentStroke}
							strokeWidth={2}
							fill="url(#onco-area-grad)"
							dot={false}
							activeDot={{ r: 4, fill: t.accentStroke, stroke: t.dotBg, strokeWidth: 2 }}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</ChartShell>
		);
	}

	if (tipo === "pie") {
		return (
			<ChartShell titulo={titulo} tokens={t}>
				<ResponsiveContainer width="100%" height={280}>
					<PieChart>
						<Pie
							data={datos}
							dataKey="valor"
							nameKey="nombre"
							cx="50%"
							cy="48%"
							outerRadius={95}
							innerRadius={38}
							paddingAngle={2}
							label={({ name, percent }: { name?: string; percent?: number }) =>
								`${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
							}
							labelLine={{ stroke: t.axisColor, strokeWidth: 1 }}
						>
							{datos.map((_, index) => (
								<Cell
									key={`cell-${index}`}
									fill={MEDICAL_PALETTE[index % MEDICAL_PALETTE.length]}
									stroke={t.chartBg}
									strokeWidth={2}
								/>
							))}
						</Pie>
						<Tooltip
							contentStyle={tooltipStyle}
							itemStyle={{ color: t.tooltipText, fontFamily: '"Courier New", monospace' }}
						/>
					</PieChart>
				</ResponsiveContainer>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", paddingTop: "4px", paddingLeft: "4px" }}>
					{datos.map((d, i) => (
						<div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
							<span
								style={{
									width: "8px",
									height: "8px",
									borderRadius: "2px",
									background: MEDICAL_PALETTE[i % MEDICAL_PALETTE.length],
									flexShrink: 0,
									display: "inline-block",
								}}
							/>
							<span
								style={{
									fontSize: "11px",
									color: t.legendText,
									fontFamily: '"Courier New", monospace',
									letterSpacing: "0.03em",
								}}
							>
								{d.nombre}
							</span>
						</div>
					))}
				</div>
			</ChartShell>
		);
	}

	return null;
}
