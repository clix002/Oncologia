import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
	variable: "--font-ibm-plex-mono",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

const dmSans = DM_Sans({
	variable: "--font-dm-sans",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "INEN Oncología — BI Dashboard Perú",
	description:
		"Sistema de inteligencia de negocios para análisis de índices de cáncer en Perú, 2022–2025.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" className="dark">
			<body className={`${ibmPlexMono.variable} ${dmSans.variable}`}>
				<TooltipProvider>{children}</TooltipProvider>
			</body>
		</html>
	);
}
