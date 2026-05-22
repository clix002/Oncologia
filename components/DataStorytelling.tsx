"use client";

/**
 * DataStorytelling — Narrativa guiada de datos oncológicos
 * Cuenta la historia del cáncer en Perú paso a paso
 */

const STEPS = [
  {
    title: "El panorama nacional",
    text: "Entre 2022 y 2025, se registraron más de 66,000 nuevos casos oncológicos en el INEN. Lima concentra el 54% de los casos, seguida por Áncash y Piura. Esto refleja tanto la densidad poblacional como la centralización de servicios especializados.",
    stat: "66,145",
    label: "casos registrados",
  },
  {
    title: "La mortalidad silenciosa",
    text: "SINADEF reporta 138,256 fallecimientos con causa oncológica entre 2017 y 2024. Eso equivale al 12.2% del total de defunciones en el país. La insuficiencia respiratoria, frecuentemente vinculada a cáncer pulmonar metastásico, es la causa inmediata más común.",
    stat: "138,256",
    label: "fallecimientos oncológicos",
  },
  {
    title: "La brecha de género",
    text: "Las mujeres representan aproximadamente el 58% de los casos atendidos en INEN. El cáncer de cérvix y mama lideran los diagnósticos femeninos, mientras que en hombres predomina el cáncer de próstata y estómago.",
    stat: "58%",
    label: "mujeres",
  },
  {
    title: "Geografía del cáncer",
    text: "La costa concentra la mayor incidencia, pero la sierra muestra tasas ajustadas por población que revelan un subregistro histórico. Ayacucho, con 1,687 casos, tiene una tasa de 25.2 por 100k habitantes — comparable a regiones con mayor infraestructura.",
    stat: "25.2",
    label: "tasa/100k en Ayacucho",
  },
  {
    title: "El factor edad",
    text: "El 45% de los casos se concentra entre los 41 y 70 años, la población económicamente activa. Los adultos mayores (61+) representan el 35% de los diagnósticos, evidenciando la necesidad de programas de tamizaje en población geriátrica.",
    stat: "45%",
    label: "casos entre 41-70 años",
  },
];

export default function DataStorytelling() {
  return (
    <div className="space-y-6">
      <div className="border-l-2 border-primary pl-4 py-1">
        <h2 className="text-sm font-mono uppercase tracking-wider text-primary">
          Data Storytelling
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          La historia del cáncer en el Perú, contada a través de los datos
        </p>
      </div>

      <div className="space-y-4">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="bg-secondary/50 border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="font-mono text-2xl text-primary/40 font-bold leading-none mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {step.text}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="font-mono text-lg font-bold text-primary">
                  {step.stat}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {step.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
