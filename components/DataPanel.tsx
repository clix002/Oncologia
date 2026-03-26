"use client";

// WHY: Data provenance in public health BI is not a footnote — it's core credibility.
// This panel should read like the appendix of an epidemiological study, not a tooltip.

import { useState } from "react";

const LIMITACIONES = [
	{
		code: "L-01",
		text: "Solo pacientes que llegaron al INEN en Lima — no representa todos los casos de cáncer en Ayacucho.",
	},
	{
		code: "L-02",
		text: "Sin clasificación por tipo de cáncer (CIE-10) — el clasificador no está publicado en datos abiertos.",
	},
	{
		code: "L-03",
		text: "Solo incidencia (casos nuevos) — no se dispone de datos de mortalidad ni sobrevivencia.",
	},
	{
		code: "L-04",
		text: "Población 2023–2026 son proyecciones INEI, no datos de censo.",
	},
];

export default function DataPanel() {
	const [open, setOpen] = useState(false);

	return (
		<div
			style={{
				borderTop: "1px solid rgba(255,255,255,0.05)",
				background: "#0a0a0f",
			}}
		>
			<div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
				<button
					onClick={() => setOpen((v) => !v)}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						background: "none",
						border: "none",
						cursor: "pointer",
						padding: "14px 0",
						color: "#444",
						fontSize: "11px",
						fontFamily: '"Courier New", monospace',
						letterSpacing: "0.08em",
						textTransform: "uppercase",
						transition: "color 0.15s",
					}}
					onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
					onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
					aria-expanded={open}
				>
					{/* Chevron */}
					<svg
						width="10"
						height="10"
						viewBox="0 0 12 12"
						fill="none"
						style={{
							transform: open ? "rotate(90deg)" : "rotate(0deg)",
							transition: "transform 0.2s",
						}}
					>
						<path
							d="M4 2l4 4-4 4"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					{open
						? "Colapsar documentación metodológica"
						: "Ver documentación metodológica y fuentes"}
				</button>
			</div>

			{open && (
				<div
					style={{
						// Elevation 1: panel sits at page level, slightly differentiated
						background: "#0b0b12",
						borderTop: "1px solid rgba(255,255,255,0.04)",
						borderBottom: "1px solid rgba(255,255,255,0.04)",
					}}
				>
					<div
						style={{
							maxWidth: "1200px",
							margin: "0 auto",
							padding: "32px 24px 40px",
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
							gap: "40px",
						}}
					>
						{/* Fuentes */}
						<section>
							<PanelSectionTitle code="§1">Fuentes de datos</PanelSectionTitle>

							<SourceRecord
								id="INEN-2022-2025"
								label="Instituto Nacional de Enfermedades Neoplásicas"
								detail="Listado de Pacientes Nuevos · Enero 2022 — Noviembre 2025"
								description="Registro de casos nuevos por departamento de residencia declarado al ingreso. Datos anonimizados provistos por el INEN."
								badge="INEN"
							/>

							<SourceRecord
								id="INEI-PROY"
								label="Instituto Nacional de Estadística e Informática"
								detail="Estimaciones y Proyecciones Departamentales · 2000 — 2026"
								description="Proyecciones de población para el departamento de Ayacucho (ubigeo 050000). Usadas como denominador para el cálculo de tasas."
								badge="INEI"
							/>

							{/* Alert: partial 2025 data */}
							<div
								style={{
									background: "rgba(243,156,18,0.05)",
									border: "1px solid rgba(243,156,18,0.15)",
									borderLeft: "2px solid rgba(243,156,18,0.5)",
									borderRadius: "2px 6px 6px 2px",
									padding: "10px 12px",
									marginTop: "12px",
								}}
							>
								<p
									style={{
										fontFamily: '"Courier New", monospace',
										color: "#f39c12",
										fontSize: "10px",
										letterSpacing: "0.08em",
										textTransform: "uppercase",
										marginBottom: "4px",
									}}
								>
									AVISO · Año 2025
								</p>
								<p
									style={{ color: "#666", fontSize: "12px", lineHeight: 1.55 }}
								>
									Datos parciales: enero–noviembre 2025. No comparar
									directamente con años completos (2022–2024).
								</p>
							</div>
						</section>

						{/* Limitaciones */}
						<section>
							<PanelSectionTitle code="§2">
								Limitaciones del estudio
							</PanelSectionTitle>

							<div
								style={{ display: "flex", flexDirection: "column", gap: "8px" }}
							>
								{LIMITACIONES.map((lim) => (
									<div
										key={lim.code}
										style={{
											display: "flex",
											gap: "12px",
											alignItems: "flex-start",
										}}
									>
										{/* Code badge — reads like a clinical annotation reference */}
										<span
											style={{
												fontFamily: '"Courier New", monospace',
												fontSize: "10px",
												color: "#444",
												letterSpacing: "0.04em",
												flexShrink: 0,
												marginTop: "1px",
												width: "32px",
											}}
										>
											{lim.code}
										</span>
										<p
											style={{
												color: "#555",
												fontSize: "12px",
												lineHeight: 1.6,
												margin: 0,
											}}
										>
											{lim.text}
										</p>
									</div>
								))}
							</div>
						</section>

						{/* Metodología */}
						<section>
							<PanelSectionTitle code="§3">Metodología</PanelSectionTitle>

							<p
								style={{
									color: "#555",
									fontSize: "12px",
									lineHeight: 1.7,
									marginBottom: "16px",
								}}
							>
								La tasa de incidencia bruta se calcula como el cociente entre
								casos nuevos y la población estimada, escalado a 100 000
								habitantes:
							</p>

							{/* Formula block: like a textbook equation box */}
							<div
								style={{
									background: "rgba(255,255,255,0.025)",
									border: "1px solid rgba(255,255,255,0.06)",
									borderRadius: "6px",
									padding: "16px 20px",
									textAlign: "center",
									marginBottom: "16px",
								}}
							>
								<p
									style={{
										fontFamily: '"Courier New", Courier, monospace',
										color: "#c8c4ba",
										fontSize: "14px",
										letterSpacing: "0.03em",
										lineHeight: 1.5,
									}}
								>
									Tasa = (Casos / Población) × 100 000
								</p>
								<p
									style={{
										fontFamily: '"Courier New", monospace',
										color: "#333",
										fontSize: "10px",
										letterSpacing: "0.05em",
										marginTop: "6px",
										textTransform: "uppercase",
									}}
								>
									tasa bruta · por 100 000 hab.
								</p>
							</div>

							<p style={{ color: "#444", fontSize: "11px", lineHeight: 1.6 }}>
								La población de referencia corresponde a las proyecciones INEI
								anuales para Ayacucho del año en que se registraron los casos.
								No se aplica ajuste por edad.
							</p>

							{/* Version stamp — like a lab report version tag */}
							<p
								style={{
									fontFamily: '"Courier New", monospace',
									color: "#2a2a35",
									fontSize: "10px",
									letterSpacing: "0.06em",
									marginTop: "20px",
									textTransform: "uppercase",
								}}
							>
								Versión del análisis: 2026-03 · EIS9A261N
							</p>
						</section>
					</div>
				</div>
			)}
		</div>
	);
}

function PanelSectionTitle({
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
				gap: "8px",
				marginBottom: "16px",
				paddingBottom: "10px",
				borderBottom: "1px solid rgba(255,255,255,0.05)",
			}}
		>
			<span
				style={{
					fontFamily: '"Courier New", monospace',
					fontSize: "10px",
					color: "#333",
					letterSpacing: "0.06em",
				}}
			>
				{code}
			</span>
			<span
				style={{
					fontFamily: "Georgia, serif",
					color: "#888",
					fontSize: "13px",
					fontWeight: 600,
					letterSpacing: "0.01em",
				}}
			>
				{children}
			</span>
		</div>
	);
}

function SourceRecord({
	id,
	label,
	detail,
	description,
	badge,
}: {
	id: string;
	label: string;
	detail: string;
	description: string;
	badge: string;
}) {
	return (
		<div
			style={{
				// Elevation 2: source card
				background: "rgba(255,255,255,0.02)",
				border: "1px solid rgba(255,255,255,0.05)",
				borderRadius: "6px",
				padding: "12px 14px",
				marginBottom: "8px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "6px",
				}}
			>
				<span
					style={{
						fontFamily: '"Courier New", monospace',
						background: "rgba(232,76,61,0.1)",
						color: "#c0392b",
						borderRadius: "3px",
						padding: "1px 6px",
						fontSize: "10px",
						fontWeight: 700,
						letterSpacing: "0.06em",
					}}
				>
					{badge}
				</span>
				<span style={{ color: "#666", fontSize: "12px", fontWeight: 600 }}>
					{label}
				</span>
			</div>
			<p
				style={{
					fontFamily: '"Courier New", monospace',
					color: "#444",
					fontSize: "10px",
					letterSpacing: "0.04em",
					marginBottom: "6px",
					textTransform: "uppercase",
				}}
			>
				{detail}
			</p>
			<p style={{ color: "#444", fontSize: "12px", lineHeight: 1.55 }}>
				{description}
			</p>
			<p
				style={{
					fontFamily: '"Courier New", monospace',
					color: "#2a2a35",
					fontSize: "10px",
					marginTop: "8px",
					letterSpacing: "0.04em",
				}}
			>
				REF: {id}
			</p>
		</div>
	);
}
