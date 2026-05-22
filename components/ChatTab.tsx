"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChartRenderer from "./ChartRenderer";

/** Renders a markdown string as simple HTML (bold, italic, inline code, lists). */
function MarkdownText({ text }: { text: string }) {
	const lines = text.split("\n");
	const elements: React.ReactNode[] = [];

	const parseInline = (line: string, key: string): React.ReactNode => {
		// Split on **bold**, *italic*, `code`
		const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
		return (
			<span key={key}>
				{parts.map((part, i) => {
					if (part.startsWith("**") && part.endsWith("**"))
						return <strong key={i}>{part.slice(2, -2)}</strong>;
					if (part.startsWith("*") && part.endsWith("*"))
						return <em key={i}>{part.slice(1, -1)}</em>;
					if (part.startsWith("`") && part.endsWith("`"))
						return (
							<code key={i} className="bg-muted px-1 rounded text-xs font-mono">
								{part.slice(1, -1)}
							</code>
						);
					return part;
				})}
			</span>
		);
	};

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (/^#{1,3}\s/.test(line)) {
			elements.push(
				<p key={i} className="font-semibold mt-1">
					{parseInline(line.replace(/^#{1,3}\s/, ""), `h-${i}`)}
				</p>,
			);
		} else if (/^[-*]\s/.test(line)) {
			const listItems: React.ReactNode[] = [];
			while (i < lines.length && /^[-*]\s/.test(lines[i])) {
				listItems.push(
					<li key={i}>{parseInline(lines[i].replace(/^[-*]\s/, ""), `li-${i}`)}</li>,
				);
				i++;
			}
			elements.push(
				<ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
					{listItems}
				</ul>,
			);
			continue;
		} else if (line.trim() === "") {
			elements.push(<br key={i} />);
		} else {
			elements.push(<p key={i}>{parseInline(line, `p-${i}`)}</p>);
		}
		i++;
	}

	return <div className="space-y-0.5">{elements}</div>;
}

interface Message {
	role: "user" | "assistant";
	text: string;
	grafica?: any;
}

interface ChatTabProps {
	region: string | null;
}

const SUGGESTIONS = [
	"¿Cuántos casos hubo en 2024?",
	"Compara hombres y mujeres",
	"¿Qué provincia tiene más casos?",
	"Tendencia mensual del último año",
];

export default function ChatTab({ region }: ChatTabProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const sendMessage = async (text: string) => {
		if (!text.trim() || loading) return;
		const userMsg: Message = { role: "user", text };
		setMessages((prev) => [...prev, userMsg]);
		setInput("");
		setLoading(true);

		try {
			const history = messages.map((m) => ({
				role: m.role,
				content: m.text,
			}));
			const body: any = { message: text, history };
			if (region) body.region = region;

			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					text: data.texto || data.error || "Sin respuesta",
					grafica: data.grafica || null,
				},
			]);
		} catch {
			setMessages((prev) => [
				...prev,
				{ role: "assistant", text: "Error de conexión" },
			]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col h-[400px]">
			<ScrollArea className="flex-1 pr-3" ref={scrollRef}>
				{messages.length === 0 && (
					<div className="py-6 space-y-3">
						<p className="text-sm text-muted-foreground text-center mb-4">
							Pregunta sobre los datos oncológicos
							{region ? ` de ${region}` : " del Perú"}
						</p>
						<div className="grid grid-cols-2 gap-2">
							{SUGGESTIONS.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => sendMessage(s)}
									className="text-left text-xs p-2.5 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
								>
									{s}
								</button>
							))}
						</div>
					</div>
				)}

				<div className="space-y-4 py-2">
					{messages.map((m, i) => (
						<div
							key={`msg-${i}`}
							className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
						>
							<div
								className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
									m.role === "user"
										? "bg-primary/20 text-foreground"
										: "bg-secondary text-foreground"
								}`}
							>
								<MarkdownText text={m.text} />
								{m.grafica && (
									<div className="mt-3">
										<ChartRenderer grafica={m.grafica} />
									</div>
								)}
							</div>
						</div>
					))}
					{loading && (
						<div className="flex justify-start">
							<div className="bg-secondary rounded-lg px-3 py-2 text-sm text-muted-foreground">
								<span className="animate-pulse">Analizando datos...</span>
							</div>
						</div>
					)}
				</div>
			</ScrollArea>

			<div className="flex gap-2 pt-3 border-t border-border mt-2">
				<Input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
					placeholder={
						region
							? `Preguntar sobre ${region}...`
							: "Preguntar sobre datos oncológicos..."
					}
					className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
					disabled={loading}
				/>
				<Button
					onClick={() => sendMessage(input)}
					disabled={loading || !input.trim()}
					size="sm"
					className="bg-primary text-primary-foreground hover:bg-primary/80"
				>
					Enviar
				</Button>
			</div>
		</div>
	);
}
