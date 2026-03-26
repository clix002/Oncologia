"use client";

// WHY: Charts in a clinical BI context should feel like instrument readouts,
// not business dashboards. Minimal chrome, precise data, quiet authority.

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

// Medical domain palette: blood red → amber bile → slate surgical → ECG green
// Each color has an epidemiological counterpart in real clinical signage
const MEDICAL_PALETTE = [
	"#c0392b", // Rojo eritrocito — caso principal
	"#d68910", // Ámbar INEN — datos institucionales
	"#2e86c1", // Azul radiografía — datos comparativos
	"#1e8449", // Verde ECG — tendencia positiva
	"#7d3c98", // Violeta oncológico — datos específicos
	"#b7950b", // Dorado cultivo — subgrupos
	"#1a5276", // Azul profundo — fondo quirúrgico
	"#922b21", // Carmín — valores críticos
];

const tooltipStyle = {
	backgroundColor: "#111118",
	border: "1px solid rgba(255,255,255,0.08)",
	borderRadius: "6px",
	color: "#e8e4da",
	fontSize: "12px",
	padding: "8px 12px",
	fontFamily: '"Courier New", monospace',
	letterSpacing: "0.03em",
	boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
};

const axisStyle = {
	fill: "#444",
	fontSize: 11,
	fontFamily: '"Courier New", monospace',
};

const gridStroke = "rgba(255,255,255,0.04)";

// Wrapper that gives the chart its clinical container appearance
function ChartShell({
	titulo,
	children,
}: {
	titulo: string;
	children: React.ReactNode;
}) {
	return (
		<div
			style={{
				// Elevation 3: slightly brighter than message bubble (elevation 2)
				background: "#111118",
				border: "1px solid rgba(255,255,255,0.07)",
				borderRadius: "10px",
				padding: "20px 16px 16px",
				marginTop: "12px",
				position: "relative",
				overflow: "hidden",
			}}
		>
			{/* Signature accent: left edge colored strip — like ECG paper has colored borders */}
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

			{/* Chart title: monospace label like a diagnostic report header */}
			<div style={{ marginBottom: "16px", paddingLeft: "4px" }}>
				<p
					style={{
						fontFamily: "Georgia, serif",
						fontSize: "13px",
						fontWeight: 600,
						color: "#c8c4ba",
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

// Custom tooltip label formatter
function TooltipLabel({ label }: { label: string }) {
	return (
		<span
			style={{
				color: "#888",
				display: "block",
				marginBottom: "2px",
				fontSize: "10px",
			}}
		>
			{label}
		</span>
	);
}
void TooltipLabel; // suppress unused warning

export default function ChartRenderer({ grafica }: Props) {
	if (!grafica?.tipo || !grafica.datos || grafica.datos.length === 0) {
		return null;
	}

	const { tipo, titulo, datos, ejeX, ejeY } = grafica;

	if (tipo === "bar") {
		return (
			<ChartShell titulo={titulo}>
				<ResponsiveContainer width="100%" height={280}>
					<BarChart
						data={datos}
						margin={{ top: 4, right: 12, left: -8, bottom: 36 }}
					>
						<CartesianGrid
							strokeDasharray="2 4"
							stroke={gridStroke}
							vertical={false}
						/>
						<XAxis
							dataKey="nombre"
							tick={axisStyle}
							axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
							tickLine={false}
							label={{
								value: ejeX,
								position: "insideBottom",
								offset: -24,
								fill: "#333",
								fontSize: 10,
								fontFamily: '"Courier New", monospace',
								letterSpacing: "0.06em",
							}}
						/>
						<YAxis
							tick={axisStyle}
							axisLine={false}
							tickLine={false}
							label={{
								value: ejeY,
								angle: -90,
								position: "insideLeft",
								offset: 16,
								fill: "#333",
								fontSize: 10,
								fontFamily: '"Courier New", monospace',
								letterSpacing: "0.06em",
							}}
						/>
						<Tooltip
							contentStyle={tooltipStyle}
							cursor={{ fill: "rgba(232,76,61,0.04)" }}
							labelStyle={{
								color: "#666",
								fontFamily: '"Courier New", monospace',
								fontSize: "11px",
								marginBottom: "4px",
							}}
							itemStyle={{ color: "#e8e4da" }}
						/>
						<Bar
							dataKey="valor"
							fill="#c0392b"
							radius={[3, 3, 0, 0]}
							maxBarSize={48}
							// Slight opacity variation for depth without multi-color noise
							opacity={0.9}
						/>
					</BarChart>
				</ResponsiveContainer>
			</ChartShell>
		);
	}

	if (tipo === "line") {
		return (
			<ChartShell titulo={titulo}>
				<ResponsiveContainer width="100%" height={280}>
					<LineChart
						data={datos}
						margin={{ top: 4, right: 12, left: -8, bottom: 36 }}
					>
						<CartesianGrid
							strokeDasharray="2 4"
							stroke={gridStroke}
							vertical={false}
						/>
						<XAxis
							dataKey="nombre"
							tick={axisStyle}
							axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
							tickLine={false}
							label={{
								value: ejeX,
								position: "insideBottom",
								offset: -24,
								fill: "#333",
								fontSize: 10,
								fontFamily: '"Courier New", monospace',
							}}
						/>
						<YAxis
							tick={axisStyle}
							axisLine={false}
							tickLine={false}
							label={{
								value: ejeY,
								angle: -90,
								position: "insideLeft",
								offset: 16,
								fill: "#333",
								fontSize: 10,
								fontFamily: '"Courier New", monospace',
							}}
						/>
						<Tooltip
							contentStyle={tooltipStyle}
							cursor={{ stroke: "rgba(232,76,61,0.2)", strokeWidth: 1 }}
							labelStyle={{
								color: "#666",
								fontFamily: '"Courier New", monospace',
								fontSize: "11px",
								marginBottom: "4px",
							}}
							itemStyle={{ color: "#e8e4da" }}
						/>
						{/* Two-tone line: main stroke + highlight — signature ECG aesthetic */}
						<Line
							type="monotone"
							dataKey="valor"
							stroke="#e84c3d"
							strokeWidth={2}
							dot={{ fill: "#111118", stroke: "#e84c3d", strokeWidth: 2, r: 3 }}
							activeDot={{
								r: 5,
								fill: "#e84c3d",
								stroke: "#0a0a0f",
								strokeWidth: 2,
							}}
						/>
					</LineChart>
				</ResponsiveContainer>
			</ChartShell>
		);
	}

	if (tipo === "area") {
		return (
			<ChartShell titulo={titulo}>
				<ResponsiveContainer width="100%" height={280}>
					<AreaChart
						data={datos}
						margin={{ top: 4, right: 12, left: -8, bottom: 36 }}
					>
						<defs>
							{/* Gradient: visible top, fades out — like ECG amplitude visualization */}
							<linearGradient id="onco-area-grad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#e84c3d" stopOpacity={0.22} />
								<stop offset="75%" stopColor="#e84c3d" stopOpacity={0.03} />
								<stop offset="100%" stopColor="#e84c3d" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="2 4"
							stroke={gridStroke}
							vertical={false}
						/>
						<XAxis
							dataKey="nombre"
							tick={axisStyle}
							axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
							tickLine={false}
							label={{
								value: ejeX,
								position: "insideBottom",
								offset: -24,
								fill: "#333",
								fontSize: 10,
								fontFamily: '"Courier New", monospace',
							}}
						/>
						<YAxis
							tick={axisStyle}
							axisLine={false}
							tickLine={false}
							label={{
								value: ejeY,
								angle: -90,
								position: "insideLeft",
								offset: 16,
								fill: "#333",
								fontSize: 10,
								fontFamily: '"Courier New", monospace',
							}}
						/>
						<Tooltip
							contentStyle={tooltipStyle}
							cursor={{ stroke: "rgba(232,76,61,0.2)", strokeWidth: 1 }}
							labelStyle={{
								color: "#666",
								fontFamily: '"Courier New", monospace',
								fontSize: "11px",
								marginBottom: "4px",
							}}
							itemStyle={{ color: "#e8e4da" }}
						/>
						<Area
							type="monotone"
							dataKey="valor"
							stroke="#e84c3d"
							strokeWidth={2}
							fill="url(#onco-area-grad)"
							dot={false}
							activeDot={{
								r: 4,
								fill: "#e84c3d",
								stroke: "#0a0a0f",
								strokeWidth: 2,
							}}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</ChartShell>
		);
	}

	if (tipo === "pie") {
		return (
			<ChartShell titulo={titulo}>
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
							// Donut: WHY — donut form avoids the "pie = percentage slice" misleading
							// visual; more appropriate for absolute count data in clinical contexts
							paddingAngle={2}
							label={({ name, percent }: { name?: string; percent?: number }) =>
								`${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
							}
							labelLine={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
						>
							{datos.map((_, index) => (
								<Cell
									key={`cell-${index}`}
									fill={MEDICAL_PALETTE[index % MEDICAL_PALETTE.length]}
									stroke="rgba(10,10,15,0.4)"
									strokeWidth={1}
								/>
							))}
						</Pie>
						<Tooltip
							contentStyle={tooltipStyle}
							itemStyle={{
								color: "#e8e4da",
								fontFamily: '"Courier New", monospace',
							}}
						/>
					</PieChart>
				</ResponsiveContainer>

				{/* Legend: custom, not Recharts default — cleaner, no crowding */}
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "8px 16px",
						paddingTop: "4px",
						paddingLeft: "4px",
					}}
				>
					{datos.map((d, i) => (
						<div
							key={i}
							style={{ display: "flex", alignItems: "center", gap: "6px" }}
						>
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
									color: "#666",
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
