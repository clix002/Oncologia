"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelRight } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import ChatTab from "./ChatTab";
import DataStorytelling from "./DataStorytelling";
import BalancedScorecard from "./BalancedScorecard";
import OKRsPanel from "./OKRsPanel";

interface TopbarProps {
	selectedRegion: string | null;
	onClearRegion: () => void;
	departamento?: string;
}

export default function Topbar({
	selectedRegion,
	onClearRegion,
	departamento = "PERÚ",
}: TopbarProps) {
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

			<nav className="flex items-center gap-2">
				<ThemeToggle />
				<Link
					href="/arquitectura"
					className="text-sm text-muted-foreground hover:text-primary transition-colors px-2"
				>
					Data Catalog →
				</Link>

				{/* Sheet de herramientas — vive en la Topbar */}
				<Sheet>
					<SheetTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5 font-mono text-xs"
						>
							<PanelRight className="h-3.5 w-3.5" />
							Herramientas
						</Button>
					</SheetTrigger>
					<SheetContent
						side="right"
						className="w-full sm:w-[700px] sm:max-w-[700px] flex flex-col gap-0 p-0"
					>
						<SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
							<SheetTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
								Herramientas · {departamento}
							</SheetTitle>
						</SheetHeader>

						<Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
							<TabsList className="mx-4 mt-3 bg-secondary border border-border self-start shrink-0">
								<TabsTrigger
									value="chat"
									className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono"
								>
									Chat IA
								</TabsTrigger>
								<TabsTrigger
									value="story"
									className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono"
								>
									Historia
								</TabsTrigger>
								<TabsTrigger
									value="bsc"
									className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono"
								>
									BSC
								</TabsTrigger>
								<TabsTrigger
									value="okrs"
									className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono"
								>
									OKRs
								</TabsTrigger>
							</TabsList>

							<div className="flex-1 overflow-y-auto px-4 py-3">
								<TabsContent value="chat" className="mt-0 h-full">
									<ChatTab region={selectedRegion} />
								</TabsContent>
								<TabsContent value="story" className="mt-0">
									<DataStorytelling />
								</TabsContent>
								<TabsContent value="bsc" className="mt-0">
									<BalancedScorecard />
								</TabsContent>
								<TabsContent value="okrs" className="mt-0">
									<OKRsPanel />
								</TabsContent>
							</div>
						</Tabs>
					</SheetContent>
				</Sheet>
			</nav>
		</header>
	);
}
