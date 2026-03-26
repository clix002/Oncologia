"use client";

import { type MouseEvent, useState } from "react";
import DashboardPanel from "@/components/DashboardPanel";
import MapSidebar from "@/components/MapSidebar";
import PeruPaths from "@/components/PeruPaths";
import Topbar from "@/components/Topbar";
import { useDashboardData } from "@/hooks/use-dashboard-data";

/** Genera un choropleth: más casos → más intenso */
function buildColorMap(
	ranking: { departamento: string; casos: number }[],
): Record<string, string> {
	if (!ranking.length) return {};
	const max = Math.max(...ranking.map((r) => r.casos));
	const map: Record<string, string> = {};
	for (const { departamento, casos } of ranking) {
		const intensity = casos / max; // 0–1
		// Escala de azul oscuro → naranja según intensidad
		const r = Math.round(30 + intensity * 200);
		const g = Math.round(60 - intensity * 30);
		const b = Math.round(120 - intensity * 90);
		map[departamento] = `rgb(${r},${g},${b})`;
	}
	return map;
}

export default function Home() {
	const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		name: string;
	} | null>(null);

	const { data, national, loading } = useDashboardData(selectedRegion);

	const colorMap = national?.ranking ? buildColorMap(national.ranking) : {};

	const handleRegionEnter = (e: MouseEvent<SVGPathElement>, name: string) => {
		setTooltip({ x: e.clientX, y: e.clientY, name });
	};

	const handleRegionMove = (e: MouseEvent<SVGPathElement>) => {
		setTooltip((prev) =>
			prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
		);
	};

	return (
		<div className="flex flex-col h-screen bg-background">
			<Topbar
				selectedRegion={selectedRegion}
				onClearRegion={() => setSelectedRegion(null)}
			/>

			<div className="flex-1 grid grid-cols-1 md:grid-cols-[240px_1fr_1fr] overflow-hidden">
				{/* Sidebar */}
				<div className="hidden md:block overflow-y-auto">
					<MapSidebar
						national={national}
						selectedRegion={selectedRegion}
						onRegionSelect={setSelectedRegion}
					/>
				</div>

				{/* Mapa */}
				<div className="relative flex items-center justify-center bg-background border-r border-border overflow-hidden p-4">
					<svg
						viewBox="0 0 585 990"
						className="w-full h-full max-h-[calc(100vh-56px)]"
						style={{ maxWidth: 400 }}
					>
						<PeruPaths
							onRegionEnter={handleRegionEnter}
							onRegionMove={handleRegionMove}
							onRegionLeave={() => setTooltip(null)}
							onRegionClick={setSelectedRegion}
							selectedRegion={selectedRegion}
							colorMap={colorMap}
						/>
					</svg>

					{/* Tooltip */}
					{tooltip && (
						<div
							className="absolute pointer-events-none bg-card border border-border rounded px-2 py-1 text-xs font-mono text-foreground shadow-lg z-10"
							style={{ left: tooltip.x + 12, top: tooltip.y }}
						>
							{tooltip.name}
						</div>
					)}
				</div>

				{/* Dashboard */}
				<div className="overflow-y-auto">
					<DashboardPanel
						data={data}
						national={national}
						loading={loading}
						selectedRegion={selectedRegion}
					/>
				</div>
			</div>
		</div>
	);
}
