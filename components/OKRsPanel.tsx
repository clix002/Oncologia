"use client";

/**
 * OKRs Oncológicos — Objectives & Key Results
 * Visualización tipo semáforo con indicadores de progreso
 */

interface OKR {
  objective: string;
  keyResults: {
    text: string;
    progress: number;
    target: string;
  }[];
}

const OKRS: OKR[] = [
  {
    objective: "Reducir la mortalidad por cáncer cérvix",
    keyResults: [
      { text: "Cobertura tamizaje PAP", progress: 52, target: "70%" },
      { text: "Vacunación VPH en niñas", progress: 64, target: "80%" },
      { text: "Detección en estadios I-II", progress: 38, target: "55%" },
    ],
  },
  {
    objective: "Mejorar la detección temprana general",
    keyResults: [
      { text: "% diagnósticos estadio I-II", progress: 42, target: "55%" },
      { text: "Campañas de despistaje anual", progress: 24, target: "25" },
      { text: "Tiempo promedio diagnóstico", progress: 45, target: "30 días" },
    ],
  },
  {
    objective: "Ampliar cobertura oncológica nacional",
    keyResults: [
      { text: "Deptos con centro oncológico", progress: 18, target: "25" },
      { text: "Teleconsultas oncológicas", progress: 3500, target: "10000" },
      { text: "Pacientes afiliados SIS", progress: 72, target: "90%" },
    ],
  },
];

function colorForProgress(pct: number): string {
  if (pct >= 70) return "text-emerald-400";
  if (pct >= 40) return "text-amber-400";
  return "text-red-400";
}

function bgForProgress(pct: number): string {
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function OKRCard({ okr }: { okr: OKR }) {
  return (
    <div className="bg-secondary/30 border border-border rounded-lg p-3">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {okr.objective}
      </h3>
      <div className="space-y-2.5">
        {okr.keyResults.map((kr) => {
          const pct = Math.min(kr.progress, 100);
          return (
            <div key={kr.text} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground leading-tight max-w-[70%]">
                  {kr.text}
                </span>
                <span className={`text-[10px] font-mono ${colorForProgress(pct)}`}>
                  {kr.progress}%
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${bgForProgress(pct)} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[9px] text-muted-foreground text-right">
                Meta: {kr.target}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OKRsPanel() {
  return (
    <div className="space-y-4">
      <div className="border-l-2 border-primary pl-4 py-1">
        <h2 className="text-sm font-mono uppercase tracking-wider text-primary">
          OKRs 2026
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Objectives & Key Results — Metas oncológicas nacionales
        </p>
      </div>

      <div className="space-y-3">
        {OKRS.map((okr) => (
          <OKRCard key={okr.objective} okr={okr} />
        ))}
      </div>

      <div className="flex gap-2 text-[10px] text-muted-foreground justify-end">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥70%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> 40-69%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> &lt;40%
        </span>
      </div>
    </div>
  );
}
