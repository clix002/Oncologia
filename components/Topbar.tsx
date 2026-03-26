"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
	selectedRegion: string | null;
	onClearRegion: () => void;
}

export default function Topbar({ selectedRegion, onClearRegion }: TopbarProps) {
	return (
		<header className="flex items-center justify-between border-b border-border bg-card px-4 h-14">
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
					<span className="font-mono text-sm font-semibold text-foreground tracking-wide">
						INEN
					</span>
					<span className="text-muted-foreground text-sm">·</span>
					<span className="text-muted-foreground text-sm">Oncología Perú</span>
				</div>
				{selectedRegion && (
					<Badge
						variant="secondary"
						className="cursor-pointer hover:bg-primary/20 transition-colors"
						onClick={onClearRegion}
					>
						{selectedRegion} ✕
					</Badge>
				)}
			</div>
			<nav className="flex items-center gap-4">
				<Link
					href="/arquitectura"
					className="text-sm text-muted-foreground hover:text-primary transition-colors"
				>
					Arquitectura →
				</Link>
			</nav>
		</header>
	);
}
