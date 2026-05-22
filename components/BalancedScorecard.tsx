"use client";

/**
 * BalancedScorecard — Perspectivas estratégicas de oncología
 * 4 perspectivas: Financiera, Paciente, Procesos, Aprendizaje
 */

interface Indicator {
  label: string;
  value: string;
  target: string;
  color: "green" | "amber" | "red";
}

const BSC_DATA = {
  financiera: {
    title: "Financiera",
    desc: "Eficiencia del gasto oncológico",
    indicators: [
      { label: "Costo por atención CEX", value: "S/ 184", target: "S/ 150", color: "amber" as const },
      { label: "Pacientes por establecimiento", value: "316", target: "500", color: "amber" as const },
      { label: "Cobertura SIS oncológico", value: "72%", target: "85%", color: "amber" as const },
    ],
  },
  paciente: {
    title: "Paciente",
    desc: "Resultados clínicos y experiencia",
    indicators: [
      { label: "Tasa detección temprana", value: "38%", target: "50%", color: "red" as const },
      { label: "Supervivencia a 5 años", value: "64%", target: "70%", color: "amber" as const },
      { label: "Tasa letalidad cáncer mama", value: "18%", target: "12%", color: "red" as const },
    ],
  },
  procesos: {
    title: "Procesos Internos",
    desc: "Eficiencia operativa",
    indicators: [
      { label: "Tiempo promedio diagnóstico", value: "45 días", target: "30 días", color: "red" as const },
      { label: "Cobertura tamizaje cérvix", value: "52%", target: "70%", color: "amber" as const },
      { label: "Cumplimiento protocolo", value: "88%", target: "95%", color: "green" as const },
    ],
  },
  aprendizaje: {
    title: "Aprendizaje",
    desc: "Innovación y desarrollo",
    indicators: [
      { label: "Tasa tamizaje mamografía", value: "41%", target: "60%", color: "red" as const },
      { label: "Registros digitalizados", value: "95%", target: "100%", color: "green" as const },
      { label: "Investigación oncológica", value: "12 estudios", target: "20", color: "amber" as const },
    ],
  },
};

const COLOR_MAP = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const TEXT_COLOR_MAP = {
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
};

function PerspectiveCard({
  data,
}: { data: (typeof BSC_DATA)[keyof typeof BSC_DATA] }) {
  return (
    <div className="bg-secondary/30 border border-border rounded-lg p-3">
      <h3 className="text-xs font-semibold text-foreground mb-1">{data.title}</h3>
      <p className="text-[10px] text-muted-foreground mb-3">{data.desc}</p>
      <div className="space-y-2">
        {data.indicators.map((ind) => (
          <div key={ind.label} className="space-y-0.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">{ind.label}</span>
              <span className={`text-[10px] font-mono ${TEXT_COLOR_MAP[ind.color]}`}>
                {ind.value} / {ind.target}
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${COLOR_MAP[ind.color]} transition-all`}
                style={{
                  width: `${Math.min(
                    (parseFloat(ind.value) / parseFloat(ind.target)) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BalancedScorecard() {
  return (
    <div className="space-y-4">
      <div className="border-l-2 border-primary pl-4 py-1">
        <h2 className="text-sm font-mono uppercase tracking-wider text-primary">
          Balanced Scorecard
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Tablero de mando integral — Gestión oncológica
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PerspectiveCard data={BSC_DATA.financiera} />
        <PerspectiveCard data={BSC_DATA.paciente} />
        <PerspectiveCard data={BSC_DATA.procesos} />
        <PerspectiveCard data={BSC_DATA.aprendizaje} />
      </div>
    </div>
  );
}
