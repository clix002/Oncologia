"use client";

import { Separator } from "@/components/ui/separator";
import type { NationalData } from "@/lib/types";

interface MapSidebarProps {
	national: NationalData | null;
	selectedRegion: string | null;
	onRegionSelect: (region: string) => void;
}

const ZONE_COLORS = [
	{ label: "Costa", color: "#58a6ff" },
	{ label: "Sierra", color: "#d29922" },
	{ label: "Selva", color: "#3fb950" },
	{ label: "Seleccionado", color: "#f78166" },
];

export default function MapSidebar({
	national,
	selectedRegion,
	onRegionSelect,
}: MapSidebarProps) {
	const ranking = national?.ranking || [];
	const top10 = ranking.slice(0, 10);

	return (
		<aside className="flex flex-col h-full bg-card border-r border-border p-4 overflow-y-auto">
			<div className="mb-4">
				<h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
					Mapa del Perú
				</h2>
				<div className="space-y-1.5">
					{ZONE_COLORS.map((z) => (
						<div key={z.label} className="flex items-center gap-2">
							<div
								className="w-3 h-3 rounded-sm"
								style={{ backgroundColor: z.color }}
							/>
							<span className="text-xs text-muted-foreground">{z.label}</span>
						</div>
					))}
				</div>
			</div>

			<Separator className="my-2" />

			{national && (
				<div className="mb-4">
					<p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">
						Total nacional
					</p>
					<p className="font-mono text-lg font-semibold text-foreground">
						{national.total_casos.toLocaleString()}
					</p>
					<p className="text-xs text-muted-foreground">pacientes INEN</p>
				</div>
			)}

			<Separator className="my-2" />

			<div className="flex-1">
				<h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
					Top 10 departamentos
				</h3>
				<div className="space-y-1">
					{top10.map((d, i) => (
						<button
							key={d.departamento}
							type="button"
							onClick={() => onRegionSelect(d.departamento)}
							className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
								selectedRegion === d.departamento
									? "bg-primary/20 text-primary"
									: "text-muted-foreground hover:text-foreground hover:bg-secondary"
							}`}
						>
							<span>
								<span className="font-mono mr-1.5 text-muted-foreground">
									{i + 1}.
								</span>
								{d.departamento}
							</span>
							<span className="font-mono">{d.casos.toLocaleString()}</span>
						</button>
					))}
				</div>
			</div>

			<Separator className="my-2" />

			<div className="text-[10px] text-muted-foreground space-y-1 mt-2">
				<p>Fuente: INEN — Pacientes Nuevos 2022–2025</p>
				<p>2025: datos parciales (ene–nov)</p>
			</div>
		</aside>
	);
}
