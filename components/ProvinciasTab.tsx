"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Provincia } from "@/lib/types";

interface ProvinciasTabProps {
	provincias: Provincia[];
	departamento: string;
}

export default function ProvinciasTab({
	provincias,
	departamento,
}: ProvinciasTabProps) {
	const max = Math.max(...provincias.map((p) => p.casos), 1);
	const total = provincias.reduce((s, p) => s + p.casos, 0);

	return (
		<div>
			<h3 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
				Provincias — {departamento}
			</h3>
			<div className="rounded-md border border-border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="border-border hover:bg-transparent">
							<TableHead className="text-muted-foreground font-mono text-xs">
								#
							</TableHead>
							<TableHead className="text-muted-foreground font-mono text-xs">
								Provincia
							</TableHead>
							<TableHead className="text-muted-foreground font-mono text-xs text-right">
								Casos
							</TableHead>
							<TableHead className="text-muted-foreground font-mono text-xs text-right">
								%
							</TableHead>
							<TableHead className="text-muted-foreground font-mono text-xs w-[120px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{provincias.map((p, i) => {
							const pct = total > 0 ? Math.round((p.casos / total) * 100) : 0;
							const barW = (p.casos / max) * 100;
							return (
								<TableRow
									key={p.provincia}
									className="border-border hover:bg-secondary/50"
								>
									<TableCell className="font-mono text-xs text-muted-foreground w-8">
										{i + 1}
									</TableCell>
									<TableCell className="text-sm text-foreground">
										{p.provincia}
									</TableCell>
									<TableCell className="font-mono text-sm text-right">
										{p.casos.toLocaleString()}
									</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground text-right">
										{pct}%
									</TableCell>
									<TableCell className="w-[120px]">
										<div className="w-full bg-secondary rounded-full h-1.5">
											<div
												className="h-1.5 rounded-full bg-primary transition-all"
												style={{ width: `${barW}%` }}
											/>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
