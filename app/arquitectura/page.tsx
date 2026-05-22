"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Server, Layers, BarChart4, ArrowDown, FileSpreadsheet, HardDrive, GitBranch, Workflow } from "lucide-react";

const STATS = [
  { value: "204,399", label: "Pacientes", icon: "👤" },
  { value: "66,145", label: "Atenciones INEN", icon: "🏥" },
  { value: "138,256", label: "Def. oncológicas", icon: "🎗️" },
  { value: "204,401", label: "Hechos OLAP", icon: "⭐" },
  { value: "6,986", label: "Docs clínicos", icon: "📄" },
  { value: "15,328", label: "Nodos Neo4j", icon: "🕸️" },
  { value: "25", label: "Departamentos", icon: "🗺️" },
  { value: "100%", label: "Data Quality", icon: "✅" },
];

const FUENTES = [
  {
    name: "INEN",
    label: "Casos oncológicos",
    file: "inen_pacientes_2022_2025.csv",
    rows: "66,145",
    period: "2022 – 2025",
    format: "CSV (latin-1, comma)",
    size: "9 MB",
    columns: [
      "UUID", "FEC_FILIACION", "SEXO", "EDAD",
      "UBIGEO", "LUGAR_RESIDENCIA", "CANT_ATENCIONES_CEX",
    ],
    note: "Pacientes nuevos registrados en el Instituto Nacional de Enfermedades Neoplásicas.",
  },
  {
    name: "SINADEF",
    label: "Defunciones nacionales",
    file: "fallecidos_sinadef.csv",
    rows: "1,134,173",
    period: "2017 – 2024",
    format: "CSV (pipe-delimited)",
    size: "366 MB",
    columns: [
      "SEXO", "EDAD", "DEPARTAMENTO", "PROVINCIA", "DISTRITO",
      "AÑO", "MES", "CAUSA A–F (CIE-X)",
    ],
    note: "Sistema Nacional de Defunciones. Códigos CIE-10 para filtrar causas oncológicas (C00-C97).",
  },
  {
    name: "INEI",
    label: "Proyecciones poblacionales",
    file: "inei_poblacion_departamentos.xlsx",
    rows: "300",
    period: "2000 – 2026",
    format: "Excel (4 hojas/trienio)",
    size: "52 KB",
    columns: ["UBIGEO", "DEPARTAMENTO", "TOTAL", "HOMBRES", "MUJERES"],
    note: "Proyecciones oficiales por departamento. Permite calcular tasas por 100k habitantes.",
  },
  {
    name: "DPCAN",
    label: "Reportes por tipo de cáncer",
    file: "4 archivos Excel",
    rows: "Mama · Cérvix · Colon · Próstata",
    period: "2022 – 2025",
    format: "Excel (.xlsx)",
    size: "87 MB",
    columns: ["CÁNCER DE MAMA", "CÁNCER DE CÉRVIX", "COLON-RECTO", "PRÓSTATA"],
    note: "Observatorio DPCAN. Datos desagregados por tipo de cáncer y región.",
  },
  {
    name: "ENDES",
    label: "Encuesta Demográfica y de Salud",
    file: "5 años × 13 módulos",
    rows: "~38,000 hogares/año",
    period: "2020 – 2024",
    format: "CSV (semicolon)",
    size: "1.2 GB",
    columns: ["RECH0", "RECH1", "RECH4", "CSALUD", "REC91", "REC84DV"],
    note: "Factores de riesgo, tamizaje, programas sociales. Módulos DHS estándar.",
  },
  {
    name: "SIS",
    label: "Afiliados Seguro Integral",
    file: "9 snapshots trimestrales",
    rows: "~540k / trimestre",
    period: "2023 – 2025",
    format: "CSV (comma)",
    size: "1.2 GB",
    columns: ["EDAD", "SEXO", "UBIGEO", "DX_OBESIDAD", "DX_HIPERTENSION", "CANT_ATENCIONES"],
    note: "Afiliados activos del SIS. Comorbilidades y utilización de servicios.",
  },
];

const TECH_STACK = [
  {
    category: "Frontend",
    items: [
      { name: "Next.js", version: "16.1", desc: "App Router · Turbopack · SSR" },
      { name: "React", version: "19.2", desc: "Server + Client Components" },
      { name: "TypeScript", version: "5.9", desc: "Tipado estricto" },
      { name: "Tailwind CSS", version: "4", desc: "Utility-first · dark theme" },
      { name: "shadcn/ui", version: "4", desc: "Componentes accesibles" },
      { name: "Recharts", version: "3.8", desc: "Gráficos interactivos" },
    ],
  },
  {
    category: "Bases de Datos",
    items: [
      { name: "PostgreSQL", version: "16", desc: "OLTP (3FN) + OLAP (Star Schema)" },
      { name: "MongoDB", version: "7", desc: "Documentos clínicos · 6,986 registros" },
      { name: "Redis", version: "7", desc: "Caché in-memory · 16 keys dashboard" },
      { name: "Neo4j", version: "5", desc: "Knowledge Graph · 15k nodos" },
      { name: "MinIO", version: "latest", desc: "Data Lake · 8 buckets · S3 API" },
    ],
  },
  {
    category: "Procesamiento",
    items: [
      { name: "Bun", version: "1.3", desc: "Runtime JS · ETL pipelines" },
      { name: "Python", version: "3.12", desc: "scikit-learn · spaCy · Prophet" },
      { name: "PySpark", version: "4.1", desc: "Big Data · Spark SQL · MLlib" },
      { name: "Ollama", version: "latest", desc: "gemma3:1b · nomic-embed-text" },
    ],
  },
  {
    category: "Infraestructura",
    items: [
      { name: "Podman", version: "5.8", desc: "10 contenedores · compose" },
      { name: "Fedora", version: "44", desc: "Sistema operativo host" },
      { name: "Gemini API", version: "—", desc: "Chat IA principal · fallback Ollama" },
    ],
  },
];

export default function DataCatalogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="font-mono text-xs text-foreground font-semibold tracking-wider">
                INEN ONCOLOGÍA
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              Data Catalog
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* ── Hero ── */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Data Catalog
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Fuentes de datos, infraestructura tecnológica y métricas del sistema
            de Business Intelligence para análisis oncológico en el Perú.
          </p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-4 gap-3">
          {STATS.map((s) => (
            <Card key={s.label} size="sm" className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <div className="text-lg font-bold font-mono text-foreground">
                    {s.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* ── Tabs ── */}
        <Tabs defaultValue="fuentes" className="w-full">
          <TabsList className="bg-secondary border border-border w-full justify-start">
            <TabsTrigger
              value="fuentes"
              className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono gap-2"
            >
              <Database className="h-3.5 w-3.5" />
              Fuentes de Datos
            </TabsTrigger>
            <TabsTrigger
              value="stack"
              className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono gap-2"
            >
              <Layers className="h-3.5 w-3.5" />
              Stack Tecnológico
            </TabsTrigger>
            <TabsTrigger
              value="metricas"
              className="data-[state=active]:bg-card data-[state=active]:text-primary text-xs font-mono gap-2"
            >
              <BarChart4 className="h-3.5 w-3.5" />
              Métricas
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Fuentes ── */}
          <TabsContent value="fuentes" className="space-y-4 mt-4">
            {FUENTES.map((f) => (
              <Card key={f.name} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-mono text-foreground">
                        {f.name}{" "}
                        <span className="text-muted-foreground font-normal">
                          — {f.label}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {f.note}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {f.rows} registros
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                    <span>📁 {f.file}</span>
                    <span>📅 {f.period}</span>
                    <span>📐 {f.format}</span>
                    <span>💾 {f.size}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {f.columns.map((col) => (
                      <Badge
                        key={col}
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {col}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Tab: Stack ── */}
          <TabsContent value="stack" className="space-y-6 mt-4">
            {TECH_STACK.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {group.category}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Tecnología</TableHead>
                      <TableHead className="w-[60px]">Versión</TableHead>
                      <TableHead>Rol</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-mono text-xs font-medium text-foreground">
                          {item.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.version}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.desc}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </TabsContent>

          {/* ── Tab: Métricas ── */}
          <TabsContent value="metricas" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Calidad de Datos</CardTitle>
                  <CardDescription className="text-xs">
                    Data Quality Checks ejecutados sobre OLTP + OLAP
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">OLTP</span>
                        <span className="font-mono text-emerald-400">12/12 checks</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 w-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">OLAP</span>
                        <span className="font-mono text-emerald-400">7/7 checks</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 w-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">FK Integrity</span>
                        <span className="font-mono text-emerald-400">100%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 w-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Unicidad UUID</span>
                        <span className="font-mono text-emerald-400">100%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 w-full" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Cobertura del Sílabo</CardTitle>
                  <CardDescription className="text-xs">
                    EIS9A261N — Investigación e Inteligencia de Negocios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Unidad 1 — Visión BI y Analítica", pct: 100 },
                      { label: "Unidad 2 — Infraestructura y Arquitectura", pct: 100 },
                      { label: "Unidad 3 — Analítica y Minería", pct: 100 },
                      { label: "Unidad 4 — IA y Ciencia de Datos", pct: 100 },
                    ].map((u) => (
                      <div key={u.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{u.label}</span>
                          <span className="font-mono text-primary">{u.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${u.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-mono flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    Pipeline de Datos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Flujo end-to-end: 7 etapas desde la fuente cruda hasta el dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Línea vertical */}
                    <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

                    <div className="space-y-0">
                      {[
                        {
                          step: "01",
                          label: "Ingesta Raw",
                          tech: "INEN CSV · SINADEF CSV · INEI XLSX · DPCAN · ENDES · SIS",
                          detail: "6 fuentes · 2.9 GB · encoding latin-1, pipe, semicolon",
                          icon: FileSpreadsheet,
                          color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                        },
                        {
                          step: "02",
                          label: "Data Lake",
                          tech: "MinIO · 8 buckets · S3-compatible API",
                          detail: "59 objetos raw inmutables · particionado por fuente",
                          icon: HardDrive,
                          color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                        },
                        {
                          step: "03",
                          label: "ETL → OLTP",
                          tech: "Bun + PapaParse · PostgreSQL 16 · 3FN",
                          detail: "204k pacientes · 66k atenciones · 138k diagnósticos · 100% data quality",
                          icon: ArrowDown,
                          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                        },
                        {
                          step: "04",
                          label: "OLTP → OLAP",
                          tech: "Star Schema · 6 dimensiones · PostgreSQL 16",
                          detail: "204k hechos · dims: tiempo, geografía, paciente, diagnóstico, establecimiento, fuente",
                          icon: GitBranch,
                          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                        },
                        {
                          step: "05",
                          label: "Enriquecimiento",
                          tech: "MongoDB 7 · Neo4j 5 · Redis 7",
                          detail: "6,986 docs clínicos · 15k nodos grafo conocimiento · 16 keys caché",
                          icon: Layers,
                          color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
                        },
                        {
                          step: "06",
                          label: "Analítica",
                          tech: "Python scikit-learn · spaCy · PySpark · Ollama",
                          detail: "Clustering K-means · Random Forest · NLP (NER/POS/Sentimiento) · Red Neuronal MLP",
                          icon: BarChart4,
                          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
                        },
                        {
                          step: "07",
                          label: "Visualización",
                          tech: "Next.js 16 · Recharts · shadcn/ui · Gemini/Ollama Chat",
                          detail: "Dashboard interactivo · Data Storytelling · BSC · OKRs · Chat IA con RAG",
                          icon: Server,
                          color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                        },
                      ].map((s, i) => (
                        <div key={s.step} className="relative flex gap-4 pb-5 last:pb-0">
                          {/* Círculo */}
                          <div
                            className={`relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border text-xs font-mono font-bold ${s.color}`}
                          >
                            {s.step}
                          </div>
                          {/* Contenido */}
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-foreground">
                                {s.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {s.tech}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {s.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Footer ── */}
        <footer className="border-t border-border pt-4 text-center">
          <p className="text-[10px] text-muted-foreground font-mono">
            EIS9A261N · Escuela La Pontificia · 2026
          </p>
        </footer>
      </main>
    </div>
  );
}
