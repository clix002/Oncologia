"use client";

// WHY: A clinical query interface is not a consumer chat.
// It should feel like a terminal to an epidemiological database —
// precise, austere, focused. Not friendly. Trustworthy.

import { useEffect, useRef, useState } from "react";
import ChartRenderer, { type GraficaData } from "./ChartRenderer";

interface Message {
	role: "user" | "assistant";
	content: string;
	grafica?: GraficaData | null;
}

const SUGGESTIONS = [
	"¿Cuántos casos hubo en 2023?",
	"¿Cómo varió mes a mes en 2024?",
	"¿Qué provincia tiene más casos?",
	"¿Hay diferencia entre hombres y mujeres?",
];

// Minimal processing dots — medical monitors don't have bouncy bubbles
function ProcessingIndicator() {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "10px",
				padding: "4px 0",
			}}
		>
			<SystemAvatar />
			<div
				style={{
					// Elevation 2: sits above main chat surface
					background: "#0e0e16",
					border: "1px solid rgba(255,255,255,0.06)",
					borderRadius: "2px 8px 8px 8px",
					padding: "10px 14px",
					display: "flex",
					alignItems: "center",
					gap: "5px",
				}}
			>
				{[0, 1, 2].map((i) => (
					<span
						key={i}
						style={{
							width: "5px",
							height: "5px",
							borderRadius: "50%",
							background: "#e84c3d",
							display: "inline-block",
							animation: `onco-dot 1.4s ease-in-out ${i * 0.22}s infinite`,
							opacity: 0.6,
						}}
					/>
				))}
			</div>
		</div>
	);
}

// System avatar — not a cute icon. A clinical identifier mark.
function SystemAvatar() {
	return (
		<div
			style={{
				width: "22px",
				height: "22px",
				borderRadius: "3px",
				background: "rgba(232,76,61,0.1)",
				border: "1px solid rgba(232,76,61,0.25)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
				// Signature: square avatar, not circle — clinical ID badge, not social avatar
			}}
		>
			<span
				style={{
					fontFamily: '"Courier New", monospace',
					fontSize: "9px",
					fontWeight: 700,
					color: "#e84c3d",
					letterSpacing: "-0.02em",
				}}
			>
				BI
			</span>
		</div>
	);
}

export default function ChatInterface() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, loading]);

	async function sendMessage(text: string) {
		const trimmed = text.trim();
		if (!trimmed || loading) return;

		const userMsg: Message = { role: "user", content: trimmed };
		const history = messages.map(({ role, content }) => ({ role, content }));

		setMessages((prev) => [...prev, userMsg]);
		setInput("");
		setLoading(true);

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: trimmed, history }),
			});

			if (!res.ok) throw new Error("Error en la respuesta");

			const data = await res.json();
			const assistantMsg: Message = {
				role: "assistant",
				content: data.texto ?? "Sin respuesta.",
				grafica: data.grafica ?? null,
			};
			setMessages((prev) => [...prev, assistantMsg]);
		} catch {
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: "Error al procesar la consulta. Intenta nuevamente.",
					grafica: null,
				},
			]);
		} finally {
			setLoading(false);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage(input);
		}
	}

	const showSuggestions = messages.length === 0;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				// Height: tall enough to show several exchanges without paging
				minHeight: "560px",
				maxHeight: "800px",
				// Elevation 1: base chat surface, slightly lighter than page background
				background: "#0c0c13",
				border: "1px solid rgba(255,255,255,0.06)",
				borderRadius: "10px",
				overflow: "hidden",
			}}
		>
			{/* Header: instrument bar — not a chat header */}
			<div
				style={{
					padding: "12px 16px",
					borderBottom: "1px solid rgba(255,255,255,0.05)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					background: "#0a0a10",
					flexShrink: 0,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<SystemAvatar />
					<div>
						<span
							style={{
								fontFamily: '"Courier New", monospace',
								color: "#c8c4ba",
								fontSize: "12px",
								fontWeight: 600,
								letterSpacing: "0.04em",
								display: "block",
								lineHeight: 1.2,
							}}
						>
							ONCOLOGÍA · CONSULTA DE DATOS
						</span>
						<span
							style={{
								fontFamily: '"Courier New", monospace',
								color: "#444",
								fontSize: "10px",
								letterSpacing: "0.06em",
								display: "block",
							}}
						>
							Ayacucho 2022–2025 · INEN
						</span>
					</div>
				</div>

				{/* Status indicator — signature: active session mark */}
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span
						style={{
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							background: loading ? "#f39c12" : "#22c55e",
							display: "inline-block",
							transition: "background 0.3s",
							boxShadow: loading
								? "0 0 6px rgba(243,156,18,0.5)"
								: "0 0 6px rgba(34,197,94,0.4)",
						}}
					/>
					<span
						style={{
							fontFamily: '"Courier New", monospace',
							fontSize: "10px",
							color: "#444",
							letterSpacing: "0.06em",
						}}
					>
						{loading ? "PROCESANDO" : "LISTO"}
					</span>
				</div>
			</div>

			{/* Messages scroll area */}
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "20px 16px",
					display: "flex",
					flexDirection: "column",
					gap: "16px",
					// Custom scrollbar via CSS — defined in globals
				}}
			>
				{showSuggestions && (
					<div>
						{/* Empty state: not "Hi! I'm your AI assistant" — clinical query prompt */}
						<div
							style={{
								borderBottom: "1px solid rgba(255,255,255,0.04)",
								paddingBottom: "16px",
								marginBottom: "16px",
							}}
						>
							<p
								style={{
									fontFamily: '"Courier New", monospace',
									color: "#333",
									fontSize: "11px",
									letterSpacing: "0.08em",
									textTransform: "uppercase",
									textAlign: "center",
									lineHeight: 1.6,
								}}
							>
								Ingresa una consulta sobre el registro oncológico de Ayacucho
							</p>
						</div>

						{/* Suggestion queries: formatted like database query examples */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(196px, 1fr))",
								gap: "8px",
							}}
						>
							{SUGGESTIONS.map((s) => (
								<button
									key={s}
									onClick={() => sendMessage(s)}
									style={{
										// Elevation 2: suggestion sits above scroll area
										background: "rgba(255,255,255,0.025)",
										border: "1px solid rgba(255,255,255,0.07)",
										borderLeft: "2px solid rgba(232,76,61,0.3)",
										borderRadius: "2px 6px 6px 2px",
										padding: "10px 12px",
										color: "#666",
										fontSize: "12px",
										textAlign: "left",
										cursor: "pointer",
										lineHeight: 1.45,
										fontFamily: "inherit",
										transition:
											"border-color 0.15s, color 0.15s, background 0.15s",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.color = "#c8c4ba";
										e.currentTarget.style.borderLeftColor =
											"rgba(232,76,61,0.7)";
										e.currentTarget.style.background = "rgba(232,76,61,0.05)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.color = "#666";
										e.currentTarget.style.borderLeftColor =
											"rgba(232,76,61,0.3)";
										e.currentTarget.style.background =
											"rgba(255,255,255,0.025)";
									}}
								>
									{s}
								</button>
							))}
						</div>
					</div>
				)}

				{messages.map((msg, i) => (
					<div
						key={i}
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: msg.role === "user" ? "flex-end" : "flex-start",
						}}
					>
						{msg.role === "user" ? (
							/* User query: right-aligned, minimal — like a terminal input line */
							<div
								style={{
									display: "flex",
									alignItems: "flex-start",
									gap: "8px",
									maxWidth: "78%",
								}}
							>
								<div
									style={{
										// Elevation 2: user bubble
										background: "rgba(232,76,61,0.08)",
										border: "1px solid rgba(232,76,61,0.18)",
										borderRadius: "8px 8px 2px 8px",
										padding: "9px 14px",
										color: "#c8c4ba",
										fontSize: "13px",
										lineHeight: 1.55,
										fontVariantNumeric: "tabular-nums",
									}}
								>
									{/* Signature: query prefix mark — like a terminal prompt */}
									<span
										style={{
											fontFamily: '"Courier New", monospace',
											color: "rgba(232,76,61,0.5)",
											fontSize: "11px",
											marginRight: "6px",
											userSelect: "none",
										}}
									>
										›
									</span>
									{msg.content}
								</div>
							</div>
						) : (
							/* System response: full-width, authoritative */
							<div
								style={{
									width: "100%",
									display: "flex",
									gap: "10px",
									alignItems: "flex-start",
								}}
							>
								<SystemAvatar />
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											// Elevation 2: response bubble
											background: "#0e0e16",
											border: "1px solid rgba(255,255,255,0.06)",
											borderRadius: "2px 8px 8px 8px",
											padding: "12px 14px",
											color: "#b0ac9e",
											fontSize: "13px",
											lineHeight: 1.7,
											fontVariantNumeric: "tabular-nums",
										}}
									>
										{msg.content}
									</div>
									{msg.grafica && <ChartRenderer grafica={msg.grafica} />}
								</div>
							</div>
						)}
					</div>
				))}

				{loading && <ProcessingIndicator />}
				<div ref={bottomRef} />
			</div>

			{/* Input area: terminal input feel */}
			<div
				style={{
					padding: "12px 14px",
					borderTop: "1px solid rgba(255,255,255,0.05)",
					display: "flex",
					gap: "8px",
					alignItems: "flex-end",
					background: "#0a0a10",
					flexShrink: 0,
				}}
			>
				{/* Query prefix — signature: turns textarea into a terminal-like input */}
				<span
					style={{
						fontFamily: '"Courier New", monospace',
						color: loading ? "#333" : "rgba(232,76,61,0.5)",
						fontSize: "14px",
						paddingBottom: "10px",
						flexShrink: 0,
						transition: "color 0.2s",
						userSelect: "none",
					}}
				>
					›
				</span>

				<textarea
					ref={textareaRef}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Consultar registro oncológico..."
					rows={1}
					disabled={loading}
					style={{
						flex: 1,
						background: "transparent",
						border: "none",
						borderBottom: `1px solid ${input.trim() ? "rgba(232,76,61,0.3)" : "rgba(255,255,255,0.06)"}`,
						borderRadius: 0,
						padding: "6px 0 8px",
						color: "#c8c4ba",
						fontSize: "13px",
						outline: "none",
						resize: "none",
						lineHeight: 1.5,
						fontFamily: "inherit",
						minHeight: "36px",
						maxHeight: "100px",
						transition: "border-color 0.15s",
					}}
					onFocus={(e) => {
						e.currentTarget.style.borderBottomColor = "rgba(232,76,61,0.4)";
					}}
					onBlur={(e) => {
						e.currentTarget.style.borderBottomColor = input.trim()
							? "rgba(232,76,61,0.25)"
							: "rgba(255,255,255,0.06)";
					}}
				/>

				<button
					onClick={() => sendMessage(input)}
					disabled={loading || !input.trim()}
					aria-label="Enviar consulta"
					style={{
						background: "none",
						border: "1px solid",
						borderColor:
							input.trim() && !loading
								? "rgba(232,76,61,0.4)"
								: "rgba(255,255,255,0.06)",
						borderRadius: "4px",
						width: "34px",
						height: "34px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: input.trim() && !loading ? "pointer" : "default",
						transition: "border-color 0.15s, background 0.15s",
						flexShrink: 0,
						marginBottom: "2px",
					}}
					onMouseEnter={(e) => {
						if (input.trim() && !loading) {
							e.currentTarget.style.background = "rgba(232,76,61,0.1)";
						}
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "none";
					}}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
						<path
							d="M5 12h14M12 5l7 7-7 7"
							stroke={input.trim() && !loading ? "#e84c3d" : "#333"}
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			</div>

			<style>{`
        @keyframes onco-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.7); }
          40% { opacity: 0.9; transform: scale(1); }
        }
      `}</style>
		</div>
	);
}
