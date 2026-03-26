"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardData, NationalData, RankingDepto } from "@/lib/types";
import ChatTab from "./ChatTab";
import DemografiaTab from "./DemografiaTab";
import KpiCards from "./KpiCards";
import ProvinciasTab from "./ProvinciasTab";
import TendenciaTab from "./TendenciaTab";

interface DashboardPanelProps {
	data: DashboardData | null;
	national: NationalData | null;
	loading: boolean;
	selectedRegion: string | null;
}

export default function DashboardPanel({
	data,
	national,
	loading,
	selectedRegion,
}: DashboardPanelProps) {
	const departamento = data?.departamento || "PERÚ";
	const hasRegionData = !!data && data.por_año.length > 0;

	return (
		<div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
			<KpiCards data={data} national={national} loading={loading} />

			{loading ? (
				<div className="space-y-3">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-[240px] w-full" />
				</div>
			) : (
				<Tabs defaultValue="tendencia" className="flex-1">
					<TabsList className="bg-secondary border border-border">
						<TabsTrigger
							value="tendencia"
							className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono"
						>
							Tendencia
						</TabsTrigger>
						<TabsTrigger
							value="demografia"
							className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono"
							disabled={!hasRegionData}
						>
							Demografía
						</TabsTrigger>
						<TabsTrigger
							value="provincias"
							className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono"
							disabled={!hasRegionData}
						>
							Provincias
						</TabsTrigger>
						<TabsTrigger
							value="chat"
							className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono"
						>
							Chat IA
						</TabsTrigger>
					</TabsList>

					<TabsContent value="tendencia" className="mt-4">
						{hasRegionData ? (
							<TendenciaTab
								porAnio={data.por_año}
								mensual={data.mensual}
								departamento={departamento}
							/>
						) : national ? (
							<NationalTendencia ranking={national.ranking} />
						) : null}
					</TabsContent>

					<TabsContent value="demografia" className="mt-4">
						{hasRegionData && (
							<DemografiaTab
								sexo={data.sexo}
								edad={data.edad}
								departamento={departamento}
							/>
						)}
					</TabsContent>

					<TabsContent value="provincias" className="mt-4">
						{hasRegionData && (
							<ProvinciasTab
								provincias={data.provincias}
								departamento={departamento}
							/>
						)}
					</TabsContent>

					<TabsContent value="chat" className="mt-4">
						<ChatTab region={selectedRegion} />
					</TabsContent>
				</Tabs>
			)}
		</div>
	);
}

/** Vista nacional: ranking de departamentos como barra horizontal */
function NationalTendencia({ ranking }: { ranking: RankingDepto[] }) {
	const max = Math.max(...ranking.map((r) => r.casos), 1);
	const top15 = ranking.slice(0, 15);

	return (
		<div>
			<h3 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
				Ranking por departamento
			</h3>
			<div className="space-y-1.5">
				{top15.map((d, i) => (
					<div key={d.departamento} className="flex items-center gap-2">
						<span className="font-mono text-xs text-muted-foreground w-5 text-right">
							{i + 1}
						</span>
						<span className="text-xs w-28 truncate text-foreground">
							{d.departamento}
						</span>
						<div className="flex-1 bg-secondary rounded-full h-2">
							<div
								className="h-2 rounded-full bg-primary transition-all"
								style={{ width: `${(d.casos / max) * 100}%` }}
							/>
						</div>
						<span className="font-mono text-xs text-muted-foreground w-12 text-right">
							{d.casos.toLocaleString()}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
