"use client";

// Mapa del Perú con regiones coloreadas — Ayacucho destacado
// Paths extraídos del mapa interactivo del proyecto

const REGION_COLORS: Record<string, string> = {
	// Costa norte — azules
	tumbes: "#1a6fa0",
	piura: "#2e86c1",
	lambayeque: "#3498db",
	la_libertad: "#1b5e8a",
	ancash: "#145a7c",
	lima: "#0e3d55",
	callao: "#0a2e40",
	ica: "#1a5276",
	// Sierra — ámbar/dorado
	cajamarca: "#9a6210",
	pasco: "#7d5109",
	junin: "#b7770d",
	huanuco: "#8e5b08",
	huancavelica: "#6e4606",
	apurimac: "#7b241c",
	cusco: "#6e1f1f",
	puno: "#5b1a1a",
	arequipa: "#7d2be0",
	moquegua: "#6c249c",
	tacna: "#512e8e",
	// Selva — verdes
	amazonas: "#1a7a42",
	san_martin: "#1e8449",
	loreto: "#17623a",
	ucayali: "#125230",
	madre_de_dios: "#0e4526",
	// AYACUCHO — destacado con el rojo del proyecto
	ayacucho: "#e84c3d",
};

const REGIONS = [
	{
		id: "tumbes",
		label: "Tumbes",
		cx: 47,
		cy: 164,
		path: "M38,148 L60,143 L72,152 L78,166 L74,180 L58,186 L42,180 L36,168 Z",
	},
	{
		id: "piura",
		label: "Piura",
		cx: 52,
		cy: 220,
		path: "M8,186 L36,168 L58,186 L74,180 L78,166 L100,178 L108,198 L106,228 L90,252 L68,260 L42,256 L18,240 L6,215 Z",
	},
	{
		id: "lambayeque",
		label: "Lambayeque",
		cx: 78,
		cy: 288,
		path: "M42,256 L68,260 L90,252 L106,228 L122,240 L130,260 L118,288 L98,305 L70,308 L48,295 L38,275 Z",
	},
	{
		id: "la_libertad",
		label: "La Libertad",
		cx: 108,
		cy: 350,
		path: "M38,275 L48,295 L70,308 L98,305 L118,288 L148,268 L162,280 L160,320 L148,358 L130,372 L100,378 L72,365 L52,342 L38,315 Z",
	},
	{
		id: "cajamarca",
		label: "Cajamarca",
		cx: 130,
		cy: 248,
		path: "M100,178 L108,198 L106,228 L122,240 L130,260 L148,268 L162,280 L172,265 L180,235 L175,205 L162,185 L140,178 Z",
	},
	{
		id: "amazonas",
		label: "Amazonas",
		cx: 168,
		cy: 190,
		path: "M140,178 L162,185 L175,205 L180,235 L195,240 L210,215 L220,188 L212,162 L195,140 L175,128 L155,130 L142,148 Z",
	},
	{
		id: "san_martin",
		label: "San Martín",
		cx: 213,
		cy: 288,
		path: "M180,235 L195,240 L210,215 L220,188 L235,195 L255,210 L268,242 L262,278 L248,308 L228,326 L205,318 L188,298 Z",
	},
	{
		id: "loreto",
		label: "Loreto",
		cx: 368,
		cy: 178,
		path: "M212,162 L220,188 L235,195 L255,210 L268,242 L282,252 L315,248 L375,208 L455,185 L525,158 L516,120 L510,70 L490,38 L455,22 L395,15 L340,25 L290,48 L252,82 L222,118 Z",
	},
	{
		id: "ancash",
		label: "Áncash",
		cx: 105,
		cy: 420,
		path: "M38,315 L52,342 L72,365 L100,378 L130,372 L148,358 L158,372 L154,408 L140,432 L112,440 L84,430 L58,412 L40,388 Z",
	},
	{
		id: "huanuco",
		label: "Huánuco",
		cx: 210,
		cy: 390,
		path: "M162,280 L172,265 L180,235 L188,298 L205,318 L228,326 L248,308 L268,318 L278,340 L272,382 L258,412 L232,428 L208,422 L186,402 L168,382 L158,372 L154,408 L140,432 L148,358 Z",
	},
	{
		id: "lima",
		label: "Lima",
		cx: 118,
		cy: 490,
		path: "M40,388 L58,412 L84,430 L112,440 L140,432 L154,408 L162,420 L168,458 L158,490 L142,515 L118,522 L94,514 L68,498 L45,475 L38,448 Z",
	},
	{
		id: "callao",
		label: "Callao",
		cx: 38,
		cy: 449,
		path: "M32,440 L48,436 L54,450 L46,462 L32,456 Z",
	},
	{
		id: "pasco",
		label: "Pasco",
		cx: 262,
		cy: 430,
		path: "M232,428 L258,412 L272,382 L278,340 L292,345 L298,368 L292,402 L275,425 L256,438 Z",
	},
	{
		id: "junin",
		label: "Junín",
		cx: 295,
		cy: 470,
		path: "M208,422 L232,428 L256,438 L275,425 L292,402 L298,368 L310,358 L328,366 L338,392 L332,432 L318,462 L296,478 L268,480 L244,466 L225,450 Z",
	},
	{
		id: "ucayali",
		label: "Ucayali",
		cx: 385,
		cy: 388,
		path: "M228,326 L248,308 L262,278 L268,242 L282,252 L315,248 L375,208 L455,185 L472,210 L478,248 L465,298 L448,328 L428,348 L410,368 L390,382 L368,390 L348,385 L328,366 L310,358 L298,368 L292,345 L278,340 L268,318 Z",
	},
	{
		id: "huancavelica",
		label: "Huancavelica",
		cx: 195,
		cy: 490,
		path: "M158,490 L168,458 L186,440 L208,450 L225,468 L220,492 L202,510 L182,505 Z",
	},
	{
		id: "ayacucho",
		label: "Ayacucho",
		cx: 252,
		cy: 532,
		path: "M182,505 L202,510 L220,492 L225,468 L244,466 L268,480 L280,502 L278,542 L260,572 L236,582 L210,568 L190,548 L176,524 Z",
	},
	{
		id: "apurimac",
		label: "Apurímac",
		cx: 310,
		cy: 490,
		path: "M268,480 L296,478 L318,462 L332,432 L348,450 L346,480 L328,500 L306,512 L280,502 Z",
	},
	{
		id: "cusco",
		label: "Cusco",
		cx: 400,
		cy: 508,
		path: "M306,512 L328,500 L346,480 L348,450 L368,458 L390,460 L428,450 L450,440 L470,420 L488,432 L508,458 L502,494 L488,522 L465,544 L440,558 L418,562 L390,558 L365,542 L340,525 L318,530 Z",
	},
	{
		id: "madre_de_dios",
		label: "Madre de Dios",
		cx: 485,
		cy: 478,
		path: "M470,420 L488,432 L508,458 L502,494 L488,522 L505,508 L530,512 L558,518 L572,502 L572,460 L555,430 L530,408 L505,398 L485,405 Z",
	},
	{
		id: "ica",
		label: "Ica",
		cx: 148,
		cy: 552,
		path: "M118,522 L142,515 L158,490 L182,505 L176,524 L172,558 L158,582 L138,592 L112,580 L100,554 L108,530 Z",
	},
	{
		id: "arequipa",
		label: "Arequipa",
		cx: 258,
		cy: 630,
		path: "M108,530 L112,580 L138,592 L158,582 L172,558 L190,548 L210,568 L236,582 L252,602 L260,632 L248,662 L222,672 L188,662 L158,640 L128,618 L104,594 L97,566 Z",
	},
	{
		id: "moquegua",
		label: "Moquegua",
		cx: 375,
		cy: 638,
		path: "M318,530 L340,525 L365,542 L390,558 L418,562 L440,558 L445,582 L428,610 L408,628 L385,638 L358,628 L335,608 L318,580 L315,555 Z",
	},
	{
		id: "puno",
		label: "Puno",
		cx: 435,
		cy: 580,
		path: "M318,530 L340,525 L365,542 L390,558 L418,562 L440,558 L465,544 L488,522 L502,494 L508,458 L516,468 L520,508 L515,548 L502,578 L482,605 L455,620 L428,610 L445,582 L440,558 Z",
	},
	{
		id: "tacna",
		label: "Tacna",
		cx: 378,
		cy: 690,
		path: "M315,658 L358,658 L385,668 L408,658 L428,640 L455,660 L450,695 L428,712 L395,715 L362,703 L335,682 Z",
	},
];

export default function PeruMap({ height = 600 }: { height?: number }) {
	return (
		<div
			style={{ position: "relative", display: "inline-block", width: "100%" }}
		>
			<svg
				viewBox="0 0 580 760"
				style={{
					width: "100%",
					height: height,
					filter: "drop-shadow(0 0 32px rgba(232,76,61,0.12))",
				}}
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					{/* Glow filter for Ayacucho */}
					<filter id="ayacucho-glow">
						<feGaussianBlur stdDeviation="4" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				{/* Background */}
				<rect width="580" height="760" fill="#0A0A0F" rx="8" />

				{/* Ocean hint */}
				<rect
					width="580"
					height="760"
					fill="url(#ocean)"
					rx="8"
					opacity="0.3"
				/>

				{REGIONS.map((r) => {
					const color = REGION_COLORS[r.id] ?? "#1C1929";
					const isAyacucho = r.id === "ayacucho";
					return (
						<g key={r.id}>
							<path
								d={r.path}
								fill={color}
								fillOpacity={isAyacucho ? 0.9 : 0.75}
								stroke={isAyacucho ? "#F0C060" : "#C9963A"}
								strokeWidth={isAyacucho ? 2 : 0.8}
								strokeOpacity={isAyacucho ? 1 : 0.5}
								filter={isAyacucho ? "url(#ayacucho-glow)" : undefined}
							/>
							{/* Label — solo para Ayacucho y regiones grandes */}
							{(isAyacucho ||
								[
									"loreto",
									"cusco",
									"puno",
									"arequipa",
									"ucayali",
									"madre_de_dios",
									"lima",
									"piura",
								].includes(r.id)) && (
								<text
									x={r.cx}
									y={r.cy}
									textAnchor="middle"
									fill={isAyacucho ? "#F0C060" : "rgba(245,237,214,0.55)"}
									fontSize={isAyacucho ? 10 : 7}
									fontFamily='"Courier New", monospace'
									fontWeight={isAyacucho ? 700 : 400}
									letterSpacing="0.04em"
									pointerEvents="none"
								>
									{r.label.toUpperCase()}
								</text>
							)}
						</g>
					);
				})}

				{/* Ayacucho pulse ring */}
				<circle
					cx={252}
					cy={532}
					r={18}
					fill="none"
					stroke="#e84c3d"
					strokeWidth="1"
					opacity="0.3"
				>
					<animate
						attributeName="r"
						values="14;28;14"
						dur="3s"
						repeatCount="indefinite"
					/>
					<animate
						attributeName="opacity"
						values="0.4;0;0.4"
						dur="3s"
						repeatCount="indefinite"
					/>
				</circle>
			</svg>

			{/* Leyenda */}
			<div
				style={{
					position: "absolute",
					bottom: "16px",
					right: "16px",
					background: "rgba(10,10,15,0.92)",
					border: "1px solid rgba(201,150,58,0.2)",
					borderRadius: "6px",
					padding: "10px 14px",
					backdropFilter: "blur(4px)",
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
					<LegendItem color="#e84c3d" label="Ayacucho — área de estudio" bold />
					<LegendItem color="#2e86c1" label="Costa" />
					<LegendItem color="#9a6210" label="Sierra" />
					<LegendItem color="#1e8449" label="Selva / Amazonía" />
				</div>
			</div>
		</div>
	);
}

function LegendItem({
	color,
	label,
	bold,
}: {
	color: string;
	label: string;
	bold?: boolean;
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
			<span
				style={{
					width: "10px",
					height: "10px",
					borderRadius: "2px",
					background: color,
					flexShrink: 0,
					display: "inline-block",
					boxShadow: bold ? `0 0 6px ${color}` : undefined,
				}}
			/>
			<span
				style={{
					fontFamily: '"Courier New", monospace',
					fontSize: "10px",
					color: bold ? "#F0C060" : "#8A8070",
					letterSpacing: "0.04em",
					fontWeight: bold ? 700 : 400,
				}}
			>
				{label}
			</span>
		</div>
	);
}
