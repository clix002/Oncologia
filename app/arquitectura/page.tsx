// Página de arquitectura BI — estilo documental/institucional
// Inspirada en presentación del curso EIS9A261N

import Link from "next/link";
import PeruMap from "@/components/PeruMap";

export const metadata = {
	title: "Arquitectura BI — Ayacucho Oncología",
	description:
		"Documentación de la arquitectura del sistema de Business Intelligence para análisis oncológico en Ayacucho.",
};

export default function ArquitecturaPage() {
	return (
		<div
			style={{
				background: "#0A0A0F",
				minHeight: "100vh",
				color: "#F5EDD6",
				fontFamily: "'Raleway', 'Segoe UI', sans-serif",
			}}
		>
			{/* Grain overlay */}
			<div
				style={{
					position: "fixed",
					inset: 0,
					pointerEvents: "none",
					zIndex: 9999,
					opacity: 0.025,
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
				}}
			/>

			{/* Header */}
			<header
				style={{
					borderBottom: "1px solid rgba(201,150,58,0.15)",
					padding: "28px 48px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					background:
						"linear-gradient(to bottom, rgba(10,10,15,0.98), rgba(10,10,15,0.85))",
					position: "sticky",
					top: 0,
					zIndex: 100,
					backdropFilter: "blur(8px)",
				}}
			>
				<div>
					<div
						style={{
							fontFamily: "Georgia, serif",
							fontSize: "clamp(16px,2vw,22px)",
							fontWeight: 700,
							color: "#F0C060",
							letterSpacing: "0.1em",
						}}
					>
						Arquitectura del Sistema BI
					</div>
					<div
						style={{
							fontSize: "11px",
							letterSpacing: "0.22em",
							color: "#8A8070",
							textTransform: "uppercase",
							marginTop: "4px",
						}}
					>
						Investigación e Inteligencia de Negocios · EIS9A261N
					</div>
				</div>
				<Link href="/" className="arch-back-btn">
					← Dashboard
				</Link>
			</header>

			<main
				style={{
					maxWidth: "1100px",
					margin: "0 auto",
					padding: "60px 32px 100px",
				}}
			>
				{/* Title block */}
				<section style={{ marginBottom: "72px", textAlign: "center" }}>
					<div
						style={{
							fontFamily: '"Courier New", monospace',
							fontSize: "10px",
							letterSpacing: "0.3em",
							color: "#8A8070",
							textTransform: "uppercase",
							marginBottom: "16px",
						}}
					>
						Documento técnico · Versión 2026-03
					</div>
					<h1
						style={{
							fontFamily: "Georgia, serif",
							fontSize: "clamp(28px,4vw,52px)",
							fontWeight: 700,
							color: "#F0C060",
							lineHeight: 1.1,
							letterSpacing: "0.03em",
							textShadow: "0 0 40px rgba(201,150,58,0.3)",
						}}
					>
						Sistema de Business Intelligence
						<br />
						<span style={{ color: "#E8D5A3", fontStyle: "italic" }}>
							Registro Oncológico · Ayacucho
						</span>
					</h1>
					<div
						style={{
							width: "60px",
							height: "2px",
							background: "linear-gradient(90deg, #C9963A, transparent)",
							margin: "20px auto",
						}}
					/>
					<p
						style={{
							color: "#8A8070",
							fontSize: "15px",
							lineHeight: 1.7,
							maxWidth: "620px",
							margin: "0 auto",
						}}
					>
						Arquitectura end-to-end para análisis descriptivo de casos
						oncológicos nuevos registrados en el INEN con residencia declarada
						en Ayacucho, Perú.
					</p>
				</section>

				{/* Mapa geográfico */}
				<section style={{ marginBottom: "80px" }}>
					<SectionTitle code="§0">
						Área de Estudio — Ayacucho, Perú
					</SectionTitle>
					<div
						style={{
							background: "linear-gradient(135deg, #12111A, #1C1929)",
							border: "1px solid rgba(201,150,58,0.2)",
							borderRadius: "12px",
							padding: "32px",
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "40px",
							alignItems: "center",
						}}
					>
						<PeruMap height={480} />
						<div
							style={{ display: "flex", flexDirection: "column", gap: "20px" }}
						>
							<div>
								<div
									style={{
										fontFamily: '"Courier New", monospace',
										fontSize: "10px",
										color: "#8A8070",
										letterSpacing: "0.2em",
										textTransform: "uppercase",
										marginBottom: "8px",
									}}
								>
									Región de análisis
								</div>
								<div
									style={{
										fontFamily: "Georgia, serif",
										fontSize: "32px",
										fontWeight: 700,
										color: "#e84c3d",
										lineHeight: 1.1,
									}}
								>
									Ayacucho
								</div>
								<div
									style={{
										color: "#8A8070",
										fontSize: "13px",
										marginTop: "6px",
									}}
								>
									Sierra sur del Perú · 43,814 km² · 11 provincias
								</div>
							</div>
							{[
								{
									label: "Población (2024)",
									value: "669,737 hab.",
									color: "#C9963A",
								},
								{
									label: "Casos INEN 2022–2025",
									value: "1,687 pacientes",
									color: "#e84c3d",
								},
								{
									label: "Tasa incidencia 2024",
									value: "64.6 por 100k",
									color: "#f39c12",
								},
								{
									label: "Altitud capital",
									value: "2,746 m.s.n.m.",
									color: "#2e86c1",
								},
								{
									label: "Fuente de datos",
									value: "INEN Lima · INEI",
									color: "#1e8449",
								},
							].map((s) => (
								<div
									key={s.label}
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "baseline",
										borderBottom: "1px solid rgba(255,255,255,0.04)",
										paddingBottom: "10px",
									}}
								>
									<span
										style={{
											fontFamily: '"Courier New", monospace',
											fontSize: "11px",
											color: "#555",
											letterSpacing: "0.04em",
										}}
									>
										{s.label}
									</span>
									<span
										style={{
											fontFamily: '"Courier New", monospace',
											fontSize: "13px",
											color: s.color,
											fontWeight: 700,
										}}
									>
										{s.value}
									</span>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Architecture Diagram SVG */}
				<section style={{ marginBottom: "80px" }}>
					<SectionTitle code="§1">Diagrama de Arquitectura</SectionTitle>
					<div
						style={{
							background: "linear-gradient(135deg, #12111A, #1C1929)",
							border: "1px solid rgba(201,150,58,0.2)",
							borderRadius: "12px",
							padding: "40px 24px",
							overflow: "hidden",
							position: "relative",
						}}
					>
						{/* Pattern bg */}
						<div
							style={{
								position: "absolute",
								inset: 0,
								opacity: 0.04,
								backgroundImage:
									"repeating-linear-gradient(45deg, #C9963A 0, #C9963A 1px, transparent 0, transparent 50%)",
								backgroundSize: "20px 20px",
							}}
						/>
						<ArchDiagram />
					</div>
				</section>

				{/* Layers */}
				<section style={{ marginBottom: "80px" }}>
					<SectionTitle code="§2">Capas de la Arquitectura</SectionTitle>
					<div
						style={{ display: "flex", flexDirection: "column", gap: "16px" }}
					>
						<LayerCard
							num="00"
							color="#2e86c1"
							title="Fuentes de Datos"
							subtitle="INEN + INEI · Raw Data"
							items={[
								{
									icon: "📄",
									label: "inen_pacientes_2022_2025.csv",
									desc: "~1,700 registros · encoding latin-1 · campos: LUGAR_RESIDENCIA, FEC_FILIACION, SEXO, PROV_RESIDENCIA, NUM_CEX",
								},
								{
									icon: "📊",
									label: "inei_poblacion_departamentos.xlsx",
									desc: "Estimaciones y Proyecciones 2000–2026 · Ubigeo Ayacucho: 050000 · 4 hojas por trienio",
								},
							]}
						/>
						<LayerCard
							num="01"
							color="#1e8449"
							title="ETL — Extracción, Transformación y Carga"
							subtitle="etl/process.ts · Bun runtime"
							items={[
								{
									icon: "⚙️",
									label: "Extracción",
									desc: "Lectura CSV con PapaParse (latin-1) · lectura Excel con xlsx",
								},
								{
									icon: "🔄",
									label: "Transformación",
									desc: 'Filtro LUGAR_RESIDENCIA ⊇ "AYACUCHO" · parseo FEC_FILIACION AAAAMMDD → año/mes · grupos etarios · tasa = (casos/población)×100k',
								},
								{
									icon: "💾",
									label: "Carga",
									desc: "Output: app/data/processed/ayacucho.json · commiteado al repo · sin dependencia de ejecución ETL en runtime",
								},
							]}
						/>
						<LayerCard
							num="02"
							color="#C9963A"
							title="Data Warehouse — Modelo Multidimensional"
							subtitle="ayacucho.json · Star Schema"
							items={[
								{
									icon: "⭐",
									label: "Tabla de Hechos",
									desc: "Casos oncológicos nuevos · métricas: casos (int), tasa_por_100k (float), promedio_cex (float)",
								},
								{
									icon: "📅",
									label: "Dimensión Tiempo",
									desc: "año (2022–2025), mes (1–12) · 2025 marcado como año_parcial = true",
								},
								{
									icon: "🗺️",
									label: "Dimensión Geografía",
									desc: "provincia de residencia declarada al ingreso INEN · 11 provincias de Ayacucho",
								},
								{
									icon: "👤",
									label: "Dimensión Paciente",
									desc: "sexo (FEMENINO/MASCULINO), grupo etario (0-20, 21-30, …, 81+)",
								},
								{
									icon: "🏥",
									label: "Dimensión Fuente",
									desc: "INEN Lima · INEI proyecciones · metadata de corte y limitaciones",
								},
							]}
						/>
						<LayerCard
							num="03"
							color="#7d3c98"
							title="Capa LLM — Inteligencia Artificial Aplicada"
							subtitle="lib/ai.ts · Gemini 3 Flash Preview → Claude Haiku fallback"
							items={[
								{
									icon: "🤖",
									label: "Gemini 3 Flash Preview",
									desc: "Modelo primario · Google AI Studio · tier gratuito · system instruction + JSON completo del Data Warehouse como contexto",
								},
								{
									icon: "🔄",
									label: "Claude Haiku fallback",
									desc: "Modelo secundario · Anthropic API · se activa si Gemini falla o key no disponible",
								},
								{
									icon: "📋",
									label: "System Prompt",
									desc: "Rol: analista BI de salud pública peruana · Reglas: solo datos disponibles, aclarar 2025 parcial, responder en español, formato JSON estricto: { texto, grafica }",
								},
								{
									icon: "🔢",
									label: "Data Vector (contexto)",
									desc: "Todo ayacucho.json inyectado en el system prompt → el LLM opera sobre el Data Warehouse completo en cada consulta",
								},
							]}
						/>
						<LayerCard
							num="04"
							color="#e84c3d"
							title="Data Grafos — Visualización"
							subtitle="components/ChartRenderer.tsx · Recharts"
							items={[
								{
									icon: "📊",
									label: "BarChart",
									desc: "Comparativas anuales, distribución por provincia, grupos etarios",
								},
								{
									icon: "📈",
									label: "LineChart",
									desc: "Tendencias temporales, variación mensual, evolución tasa por 100k",
								},
								{
									icon: "🥧",
									label: "PieChart (donut)",
									desc: "Distribución por sexo, proporciones relativas",
								},
								{
									icon: "🏔️",
									label: "AreaChart",
									desc: "Acumulados temporales, volumen por período",
								},
								{
									icon: "🔌",
									label: "Protocolo",
									desc: "LLM devuelve JSON { tipo, titulo, datos[], ejeX, ejeY } → ChartRenderer renderiza el componente Recharts correspondiente",
								},
							]}
						/>
						<LayerCard
							num="05"
							color="#F0C060"
							title="Frontend — Interfaz Web"
							subtitle="Next.js 15 · App Router · Bun · TypeScript"
							items={[
								{
									icon: "🖥️",
									label: "HeroSection",
									desc: "Stats 2024 al cargar: casos, tasa/100k, % femenino, provincia top · sparkline ECG mensual · datos servidos server-side",
								},
								{
									icon: "💬",
									label: "ChatInterface",
									desc: "Terminal de consulta interactiva · historial scrollable · sugerencias predefinidas · indicador de estado (LISTO/PROCESANDO)",
								},
								{
									icon: "📑",
									label: "DataPanel",
									desc: "Fuentes INEN/INEI · limitaciones L-01…L-04 · metodología tasa bruta · aviso año parcial 2025",
								},
								{
									icon: "🔗",
									label: "API Routes",
									desc: "GET /api/data → ayacucho.json completo · POST /api/chat → callAI(systemPrompt, message, history) → { texto, grafica }",
								},
							]}
						/>
					</div>
				</section>

				{/* Modelo multidimensional detalle */}
				<section style={{ marginBottom: "80px" }}>
					<SectionTitle code="§3">
						Modelo de Datos Multidimensional
					</SectionTitle>
					<div
						style={{
							background: "linear-gradient(135deg, #12111A, #1C1929)",
							border: "1px solid rgba(201,150,58,0.2)",
							borderRadius: "12px",
							padding: "40px",
						}}
					>
						<StarSchemaTable />
					</div>
				</section>

				{/* Limitaciones */}
				<section style={{ marginBottom: "80px" }}>
					<SectionTitle code="§4">Limitaciones del Sistema</SectionTitle>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))",
							gap: "16px",
						}}
					>
						{[
							{
								code: "L-01",
								title: "Cobertura INEN",
								text: "Solo pacientes que llegaron al INEN en Lima. No representa la totalidad de casos oncológicos en Ayacucho.",
							},
							{
								code: "L-02",
								title: "Sin CIE-10",
								text: "No incluye diagnóstico por tipo de cáncer. El clasificador no es publicado en datos abiertos por el INEN.",
							},
							{
								code: "L-03",
								title: "Solo incidencia",
								text: "Datos de casos nuevos (incidencia). Sin mortalidad, sobrevivencia ni seguimiento de pacientes.",
							},
							{
								code: "L-04",
								title: "Proyecciones INEI",
								text: "Población 2023–2026 son proyecciones, no datos censales. El último censo fue en 2017.",
							},
							{
								code: "L-05",
								title: "2025 parcial",
								text: "Datos solo hasta noviembre 2025. No comparar directamente con años completos 2022–2024.",
							},
						].map((l) => (
							<div
								key={l.code}
								style={{
									background: "rgba(201,150,58,0.04)",
									border: "1px solid rgba(201,150,58,0.12)",
									borderLeft: "3px solid rgba(201,150,58,0.4)",
									borderRadius: "2px 8px 8px 2px",
									padding: "20px",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										marginBottom: "8px",
									}}
								>
									<span
										style={{
											fontFamily: '"Courier New", monospace',
											fontSize: "10px",
											color: "#C9963A",
											letterSpacing: "0.06em",
										}}
									>
										{l.code}
									</span>
									<span
										style={{
											fontFamily: "Georgia, serif",
											fontSize: "13px",
											color: "#F0C060",
											fontWeight: 600,
										}}
									>
										{l.title}
									</span>
								</div>
								<p
									style={{
										color: "#8A8070",
										fontSize: "13px",
										lineHeight: 1.6,
									}}
								>
									{l.text}
								</p>
							</div>
						))}
					</div>
				</section>

				{/* Flujo de una consulta */}
				<section style={{ marginBottom: "80px" }}>
					<SectionTitle code="§5">Flujo de una Consulta</SectionTitle>
					<div
						style={{
							background: "linear-gradient(135deg, #12111A, #1C1929)",
							border: "1px solid rgba(201,150,58,0.2)",
							borderRadius: "12px",
							padding: "40px",
						}}
					>
						<div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
							{[
								{
									step: "1",
									color: "#2e86c1",
									label: "Usuario escribe pregunta",
									detail: '"¿Cuántos casos hubo en 2023?"',
								},
								{
									step: "2",
									color: "#1e8449",
									label: "ChatInterface → POST /api/chat",
									detail: "{ message, history[] }",
								},
								{
									step: "3",
									color: "#C9963A",
									label: "API lee ayacucho.json completo",
									detail: "lib/data.ts → getAyacuchoData()",
								},
								{
									step: "4",
									color: "#7d3c98",
									label: "Construye system prompt con datos",
									detail: "Rol + Reglas + JSON del Data Warehouse inyectado",
								},
								{
									step: "5",
									color: "#e84c3d",
									label: "callAI() → Gemini 3 Flash",
									detail: "Si falla → fallback Claude Haiku",
								},
								{
									step: "6",
									color: "#f39c12",
									label: "LLM responde JSON estructurado",
									detail:
										'{ "texto": "...", "grafica": { tipo, titulo, datos[] } }',
								},
								{
									step: "7",
									color: "#F0C060",
									label: "parseAIResponse() valida y extrae",
									detail:
										"try/catch → si no es JSON válido, devuelve texto plano sin gráfica",
								},
								{
									step: "8",
									color: "#22c55e",
									label: "Frontend renderiza respuesta",
									detail:
										"texto en ChatInterface + ChartRenderer con datos de la gráfica",
								},
							].map((s, i, arr) => (
								<div
									key={s.step}
									style={{
										display: "flex",
										gap: "20px",
										alignItems: "flex-start",
									}}
								>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
										}}
									>
										<div
											style={{
												width: "32px",
												height: "32px",
												borderRadius: "50%",
												flexShrink: 0,
												background: `${s.color}22`,
												border: `1.5px solid ${s.color}`,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontFamily: '"Courier New", monospace',
												fontSize: "11px",
												color: s.color,
												fontWeight: 700,
											}}
										>
											{s.step}
										</div>
										{i < arr.length - 1 && (
											<div
												style={{
													width: "1px",
													height: "24px",
													background: `${s.color}30`,
												}}
											/>
										)}
									</div>
									<div
										style={{
											paddingTop: "6px",
											paddingBottom: i < arr.length - 1 ? "0" : "0",
										}}
									>
										<div
											style={{
												fontFamily: "Georgia, serif",
												fontSize: "14px",
												color: "#E8D5A3",
												fontWeight: 600,
												marginBottom: "2px",
											}}
										>
											{s.label}
										</div>
										<div
											style={{
												fontFamily: '"Courier New", monospace',
												fontSize: "11px",
												color: "#555",
												letterSpacing: "0.03em",
												marginBottom: "12px",
											}}
										>
											{s.detail}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Footer ref */}
				<footer
					style={{
						borderTop: "1px solid rgba(201,150,58,0.1)",
						paddingTop: "24px",
						textAlign: "center",
					}}
				>
					<p
						style={{
							fontFamily: '"Courier New", monospace',
							fontSize: "11px",
							color: "#333",
							letterSpacing: "0.08em",
							textTransform: "uppercase",
						}}
					>
						Escuela La Pontificia · Ingeniería de Sistemas de Información ·
						Noveno Semestre · 2026
					</p>
				</footer>
			</main>
		</div>
	);
}

// ─── Sub-components ───────────────────────────────────────────────

function SectionTitle({
	code,
	children,
}: {
	code: string;
	children: React.ReactNode;
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "baseline",
				gap: "12px",
				marginBottom: "24px",
				paddingBottom: "14px",
				borderBottom: "1px solid rgba(201,150,58,0.12)",
			}}
		>
			<span
				style={{
					fontFamily: '"Courier New", monospace',
					fontSize: "11px",
					color: "#555",
					letterSpacing: "0.06em",
				}}
			>
				{code}
			</span>
			<span
				style={{
					fontFamily: "Georgia, serif",
					color: "#C9963A",
					fontSize: "16px",
					fontWeight: 700,
					letterSpacing: "0.12em",
					textTransform: "uppercase",
				}}
			>
				{children}
			</span>
		</div>
	);
}

function LayerCard({
	num,
	color,
	title,
	subtitle,
	items,
}: {
	num: string;
	color: string;
	title: string;
	subtitle: string;
	items: { icon: string; label: string; desc: string }[];
}) {
	return (
		<div
			style={{
				background: "linear-gradient(135deg, #12111A, #1C1929)",
				border: `1px solid ${color}25`,
				borderLeft: `3px solid ${color}`,
				borderRadius: "2px 10px 10px 2px",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					padding: "16px 24px",
					borderBottom: `1px solid ${color}15`,
					display: "flex",
					alignItems: "center",
					gap: "14px",
					background: `${color}08`,
				}}
			>
				<span
					style={{
						fontFamily: '"Courier New", monospace',
						fontSize: "11px",
						color,
						letterSpacing: "0.1em",
						fontWeight: 700,
					}}
				>
					CAPA {num}
				</span>
				<div>
					<div
						style={{
							fontFamily: "Georgia, serif",
							fontSize: "16px",
							color: "#E8D5A3",
							fontWeight: 700,
						}}
					>
						{title}
					</div>
					<div
						style={{
							fontFamily: '"Courier New", monospace',
							fontSize: "10px",
							color: "#555",
							letterSpacing: "0.05em",
							marginTop: "2px",
						}}
					>
						{subtitle}
					</div>
				</div>
			</div>
			<div
				style={{
					padding: "16px 24px",
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))",
					gap: "12px",
				}}
			>
				{items.map((item) => (
					<div
						key={item.label}
						style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}
					>
						<span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>
							{item.icon}
						</span>
						<div>
							<div
								style={{
									fontSize: "12px",
									fontWeight: 600,
									color: "#C9963A",
									marginBottom: "2px",
								}}
							>
								{item.label}
							</div>
							<div
								style={{ fontSize: "12px", color: "#8A8070", lineHeight: 1.55 }}
							>
								{item.desc}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function StarSchemaTable() {
	const dims = [
		{
			name: "DIM_TIEMPO",
			color: "#2e86c1",
			fields: ["año (PK)", "mes (PK)", "completo (bool)", "nota_parcial"],
		},
		{
			name: "DIM_GEOGRAFIA",
			color: "#1e8449",
			fields: ["provincia (PK)", "departamento"],
		},
		{
			name: "DIM_PACIENTE",
			color: "#7d3c98",
			fields: ["sexo (PK)", "grupo_etario (PK)"],
		},
		{
			name: "DIM_FUENTE",
			color: "#C9963A",
			fields: ["id_fuente (PK)", "nombre", "rango_fechas", "nota"],
		},
	];
	return (
		<div>
			<div style={{ textAlign: "center", marginBottom: "36px" }}>
				{/* FACT TABLE */}
				<div
					style={{
						display: "inline-block",
						background: "rgba(232,76,61,0.08)",
						border: "2px solid rgba(232,76,61,0.5)",
						borderRadius: "8px",
						padding: "20px 32px",
						minWidth: "220px",
					}}
				>
					<div
						style={{
							fontFamily: '"Courier New", monospace',
							fontSize: "10px",
							color: "#e84c3d",
							letterSpacing: "0.15em",
							textTransform: "uppercase",
							marginBottom: "10px",
						}}
					>
						Tabla de Hechos
					</div>
					<div
						style={{
							fontFamily: "Georgia, serif",
							fontSize: "16px",
							color: "#F0C060",
							fontWeight: 700,
							marginBottom: "12px",
						}}
					>
						FACT_ONCOLOGIA
					</div>
					{[
						"año (FK → DIM_TIEMPO)",
						"mes (FK → DIM_TIEMPO)",
						"provincia (FK → DIM_GEOGRAFIA)",
						"sexo (FK → DIM_PACIENTE)",
						"grupo_etario (FK → DIM_PACIENTE)",
						"─────────────",
						"casos (medida)",
						"tasa_por_100k (medida)",
						"promedio_cex (medida)",
					].map((f) => (
						<div
							key={f}
							style={{
								fontFamily: '"Courier New", monospace',
								fontSize: "11px",
								color: f.startsWith("─")
									? "#333"
									: f.includes("FK")
										? "#C9963A"
										: "#e84c3d",
								letterSpacing: "0.02em",
								lineHeight: 1.6,
							}}
						>
							{f}
						</div>
					))}
				</div>
			</div>

			{/* DIMENSIONS */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
					gap: "16px",
				}}
			>
				{dims.map((d) => (
					<div
						key={d.name}
						style={{
							background: `${d.color}08`,
							border: `1px solid ${d.color}30`,
							borderRadius: "8px",
							padding: "16px 20px",
						}}
					>
						<div
							style={{
								fontFamily: '"Courier New", monospace',
								fontSize: "10px",
								color: d.color,
								letterSpacing: "0.12em",
								textTransform: "uppercase",
								marginBottom: "8px",
							}}
						>
							Dimensión
						</div>
						<div
							style={{
								fontFamily: "Georgia, serif",
								fontSize: "13px",
								color: "#E8D5A3",
								fontWeight: 700,
								marginBottom: "10px",
							}}
						>
							{d.name}
						</div>
						{d.fields.map((f) => (
							<div
								key={f}
								style={{
									fontFamily: '"Courier New", monospace',
									fontSize: "11px",
									color: "#555",
									lineHeight: 1.6,
								}}
							>
								{f}
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

function ArchDiagram() {
	return (
		<div style={{ position: "relative", maxWidth: "800px", margin: "0 auto" }}>
			<svg viewBox="0 0 800 420" style={{ width: "100%", overflow: "visible" }}>
				{/* Arrows */}
				<defs>
					<marker
						id="arrow-gold"
						markerWidth="10"
						markerHeight="7"
						refX="9"
						refY="3.5"
						orient="auto"
					>
						<polygon points="0 0, 10 3.5, 0 7" fill="#C9963A" opacity="0.7" />
					</marker>
					<marker
						id="arrow-blue"
						markerWidth="10"
						markerHeight="7"
						refX="9"
						refY="3.5"
						orient="auto"
					>
						<polygon points="0 0, 10 3.5, 0 7" fill="#2e86c1" opacity="0.7" />
					</marker>
					<marker
						id="arrow-red"
						markerWidth="10"
						markerHeight="7"
						refX="9"
						refY="3.5"
						orient="auto"
					>
						<polygon points="0 0, 10 3.5, 0 7" fill="#e84c3d" opacity="0.7" />
					</marker>
				</defs>

				{/* FUENTES → ETL */}
				<line
					x1="170"
					y1="64"
					x2="170"
					y2="108"
					stroke="#2e86c1"
					strokeWidth="1.5"
					strokeDasharray="4 3"
					markerEnd="url(#arrow-blue)"
					opacity="0.6"
				/>
				<line
					x1="350"
					y1="64"
					x2="295"
					y2="108"
					stroke="#2e86c1"
					strokeWidth="1.5"
					strokeDasharray="4 3"
					markerEnd="url(#arrow-blue)"
					opacity="0.6"
				/>

				{/* ETL → DW */}
				<line
					x1="230"
					y1="156"
					x2="230"
					y2="196"
					stroke="#C9963A"
					strokeWidth="1.5"
					markerEnd="url(#arrow-gold)"
					opacity="0.7"
				/>

				{/* DW → LLM */}
				<line
					x1="400"
					y1="244"
					x2="510"
					y2="244"
					stroke="#C9963A"
					strokeWidth="1.5"
					strokeDasharray="5 3"
					markerEnd="url(#arrow-gold)"
					opacity="0.5"
				/>
				<line
					x1="230"
					y1="268"
					x2="230"
					y2="308"
					stroke="#C9963A"
					strokeWidth="1.5"
					markerEnd="url(#arrow-gold)"
					opacity="0.7"
				/>

				{/* LLM → Grafos */}
				<line
					x1="600"
					y1="300"
					x2="680"
					y2="244"
					stroke="#e84c3d"
					strokeWidth="1.5"
					markerEnd="url(#arrow-red)"
					opacity="0.7"
				/>

				{/* LLM → Web */}
				<line
					x1="570"
					y1="336"
					x2="400"
					y2="370"
					stroke="#e84c3d"
					strokeWidth="1.5"
					markerEnd="url(#arrow-red)"
					opacity="0.7"
				/>
				<line
					x1="230"
					y1="376"
					x2="332"
					y2="376"
					stroke="#e84c3d"
					strokeWidth="1.5"
					markerEnd="url(#arrow-red)"
					opacity="0.7"
				/>

				{/* ── FUENTES ── */}
				<NodeBox
					x={80}
					y={20}
					w={160}
					h={44}
					color="#2e86c1"
					label="INEN CSV"
					sub="1,687 registros · 2022-2025"
				/>
				<NodeBox
					x={260}
					y={20}
					w={160}
					h={44}
					color="#2e86c1"
					label="INEI Excel"
					sub="Proyecciones · Ubigeo 050000"
				/>

				{/* ── ETL ── */}
				<NodeBox
					x={120}
					y={108}
					w={220}
					h={48}
					color="#1e8449"
					label="ETL · etl/process.ts"
					sub="PapaParse + xlsx · bun runtime"
				/>

				{/* ── DATA WAREHOUSE ── */}
				<NodeBox
					x={80}
					y={196}
					w={320}
					h={72}
					color="#C9963A"
					label="Data Warehouse · ayacucho.json"
					sub="Star Schema: Hechos + 4 Dimensiones&#10;Tiempo · Geografía · Paciente · Fuente"
					big
				/>

				{/* ── LLM ── */}
				<HexNode
					cx={595}
					cy={310}
					r={58}
					color="#7d3c98"
					label="LLM"
					sub="Gemini 3 Flash"
				/>

				{/* ── DATA VECTOR ── */}
				<NodeBox
					x={440}
					y={196}
					w={180}
					h={48}
					color="#C9963A"
					label="Data Vector"
					sub="ayacucho.json → system prompt"
				/>

				{/* ── DATA GRAFOS ── */}
				<NodeBox
					x={620}
					y={180}
					w={160}
					h={64}
					color="#e84c3d"
					label="Data Grafos"
					sub="Recharts · Bar/Line/Pie/Area"
				/>

				{/* ── WEB ── */}
				<NodeBox
					x={80}
					y={340}
					w={280}
					h={64}
					color="#F0C060"
					label="Web · Next.js 15"
					sub="HeroSection · ChatInterface · ChartRenderer&#10;DataPanel · App Router · TypeScript"
					big
				/>

				{/* Labels on arrows */}
				<text x="248" y="182" fill="#555" fontSize="9" fontFamily="monospace">
					ETL output
				</text>
				<text x="298" y="238" fill="#555" fontSize="9" fontFamily="monospace">
					context
				</text>
				<text x="248" y="302" fill="#555" fontSize="9" fontFamily="monospace">
					query
				</text>
				<text x="460" y="364" fill="#555" fontSize="9" fontFamily="monospace">
					respuesta JSON
				</text>
			</svg>
		</div>
	);
}

function NodeBox({
	x,
	y,
	w,
	h,
	color,
	label,
	sub,
	big,
}: {
	x: number;
	y: number;
	w: number;
	h: number;
	color: string;
	label: string;
	sub: string;
	big?: boolean;
}) {
	return (
		<g>
			<rect
				x={x}
				y={y}
				width={w}
				height={h}
				rx="6"
				fill={`${color}12`}
				stroke={color}
				strokeWidth="1.2"
				strokeOpacity="0.5"
			/>
			<text
				x={x + w / 2}
				y={y + (big ? 22 : 18)}
				textAnchor="middle"
				fill="#E8D5A3"
				fontSize={big ? 13 : 12}
				fontFamily="Georgia, serif"
				fontWeight="700"
			>
				{label}
			</text>
			{sub.split("&#10;").map((line, i) => (
				<text
					key={i}
					x={x + w / 2}
					y={y + (big ? 38 : 32) + i * 13}
					textAnchor="middle"
					fill="#555"
					fontSize="9"
					fontFamily="monospace"
				>
					{line}
				</text>
			))}
		</g>
	);
}

function HexNode({
	cx,
	cy,
	r,
	color,
	label,
	sub,
}: {
	cx: number;
	cy: number;
	r: number;
	color: string;
	label: string;
	sub: string;
}) {
	const pts = Array.from({ length: 6 }, (_, i) => {
		const angle = (Math.PI / 3) * i - Math.PI / 6;
		return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
	}).join(" ");
	return (
		<g>
			<polygon
				points={pts}
				fill={`${color}18`}
				stroke={color}
				strokeWidth="1.5"
				strokeOpacity="0.6"
			/>
			<text
				x={cx}
				y={cy - 6}
				textAnchor="middle"
				fill="#E8D5A3"
				fontSize="14"
				fontFamily="Georgia, serif"
				fontWeight="700"
			>
				{label}
			</text>
			<text
				x={cx}
				y={cy + 10}
				textAnchor="middle"
				fill="#555"
				fontSize="9"
				fontFamily="monospace"
			>
				{sub}
			</text>
			<text
				x={cx}
				y={cy + 22}
				textAnchor="middle"
				fill="#555"
				fontSize="9"
				fontFamily="monospace"
			>
				→ Claude fallback
			</text>
		</g>
	);
}
