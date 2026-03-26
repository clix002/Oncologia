"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData, NationalData } from "@/lib/types";

interface KpiCardsProps {
	data: DashboardData | null;
	national: NationalData | null;
	loading: boolean;
}

function KpiSkeleton() {
	return (
		<Card className="bg-card border-border">
			<CardContent className="pt-4 pb-3 px-4">
				<Skeleton className="h-3 w-20 mb-2" />
				<Skeleton className="h-7 w-16" />
			</CardContent>
		</Card>
	);
}

export default function KpiCards({ data, national, loading }: KpiCardsProps) {
	if (loading) {
		return (
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<KpiSkeleton />
				<KpiSkeleton />
				<KpiSkeleton />
				<KpiSkeleton />
			</div>
		);
	}

	if (data) {
		const totalCasos = data.por_año.reduce((s, r) => s + r.casos, 0);
		const ultimoAño = data.por_año.at(-1);
		const totalSexo = data.sexo.reduce((s, r) => s + r.casos, 0);
		const femenino = data.sexo.find((s) => s.sexo === "FEMENINO");
		const pctFem =
			totalSexo > 0 && femenino
				? Math.round((femenino.casos / totalSexo) * 100)
				: 0;
		const topProv = data.provincias[0];

		return (
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<KpiCard
					label="Total casos"
					value={totalCasos.toLocaleString()}
					sub="2022–2025"
				/>
				<KpiCard
					label={`Casos ${ultimoAño?.año || ""}`}
					value={ultimoAño?.casos.toLocaleString() || "—"}
					sub="último año"
				/>
				<KpiCard
					label="% Femenino"
					value={`${pctFem}%`}
					sub={`${femenino?.casos.toLocaleString() || 0} de ${totalSexo.toLocaleString()}`}
				/>
				<KpiCard
					label="Mayor carga"
					value={topProv?.provincia || "—"}
					sub={`${topProv?.casos.toLocaleString() || 0} casos`}
				/>
			</div>
		);
	}

	if (national) {
		const top3 = national.ranking.slice(0, 3);
		return (
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<KpiCard
					label="Total nacional"
					value={national.total_casos.toLocaleString()}
					sub="pacientes INEN"
				/>
				<KpiCard
					label="Departamentos"
					value={String(national.ranking.length)}
					sub="con datos"
				/>
				<KpiCard
					label="#1 Departamento"
					value={top3[0]?.departamento || "—"}
					sub={`${top3[0]?.casos.toLocaleString() || 0} casos`}
				/>
				<KpiCard
					label="#2 Departamento"
					value={top3[1]?.departamento || "—"}
					sub={`${top3[1]?.casos.toLocaleString() || 0} casos`}
				/>
			</div>
		);
	}

	return null;
}

function KpiCard({
	label,
	value,
	sub,
}: {
	label: string;
	value: string;
	sub: string;
}) {
	return (
		<Card className="bg-card border-border hover:border-primary/30 transition-colors">
			<CardContent className="pt-4 pb-3 px-4">
				<p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">
					{label}
				</p>
				<p className="text-xl font-semibold font-mono text-foreground truncate">
					{value}
				</p>
				<p className="text-xs text-muted-foreground mt-1">{sub}</p>
			</CardContent>
		</Card>
	);
}
