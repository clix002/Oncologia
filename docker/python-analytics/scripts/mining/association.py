"""
mining_association.py — Reglas de asociación (Apriori) para comorbilidad oncológica
"""
import psycopg2
import json
from itertools import combinations
from collections import defaultdict

CONN = "host=localhost port=5434 dbname=oncologia_olap user=oncologia password=oncologia_dev_2026"

conn = psycopg2.connect(CONN)

# Obtener diagnósticos por año/departamento
cur = conn.cursor()
cur.execute("""
    SELECT departamento, cod_cie10, SUM(casos) as casos
    FROM dm_diagnostico
    WHERE año = 2024
    GROUP BY departamento, cod_cie10
    HAVING SUM(casos) >= 50
    ORDER BY departamento, casos DESC
""")

rows = cur.fetchall()

# Agrupar por departamento: lista de cánceres con alta incidencia
depto_canceres = defaultdict(set)
for depto, cie10, casos in rows:
    if casos >= 10:  # umbral mínimo
        depto_canceres[depto].add(cie10)

# Map codes → nombres
cur.execute("SELECT cod_cie10, grupo FROM dim_diagnostico")
code_names = {row[0]: row[1] for row in cur.fetchall()}

print("=" * 60)
print("REGLAS DE ASOCIACIÓN — Comorbilidad Oncológica")
print("=" * 60)

# Contar co-ocurrencias entre tipos de cáncer
pair_counts = defaultdict(int)
single_counts = defaultdict(int)

for canceres in depto_canceres.values():
    for c in canceres:
        single_counts[c] += 1
    for c1, c2 in combinations(sorted(canceres), 2):
        pair_counts[(c1, c2)] += 1

total_deptos = len(depto_canceres)

# Calcular reglas con support, confidence, lift
reglas = []
for (c1, c2), pair_count in pair_counts.items():
    support = pair_count / total_deptos
    confidence = pair_count / single_counts[c1] if single_counts[c1] > 0 else 0
    support_b = single_counts[c2] / total_deptos if single_counts[c2] > 0 else 0
    lift = confidence / support_b if support_b > 0 else 0
    
    if support >= 0.20 and confidence >= 0.6:  # filtros más estrictos
        reglas.append({
            "antecedente": [c1],
            "consecuente": [c2],
            "support": round(support, 4),
            "confidence": round(confidence, 4),
            "lift": round(lift, 2),
        })

reglas.sort(key=lambda r: r['lift'], reverse=True)

print(f"\nTotal reglas encontradas: {len(reglas)} (support≥0.12, confidence≥0.5)")
print()

for i, r in enumerate(reglas[:10]):
    a = code_names.get(r['antecedente'][0], r['antecedente'][0])
    b = code_names.get(r['consecuente'][0], r['consecuente'][0])
    print(f"  R{i+1}: {a} → {b}")
    print(f"       support={r['support']:.3f}  confidence={r['confidence']:.3f}  lift={r['lift']:.2f}")

# Guardar
result = {
    "algoritmo": "Apriori (manual)",
    "parametros": {"min_support": 0.12, "min_confidence": 0.5, "min_casos": 10},
    "total_reglas": len(reglas),
    "top_reglas": reglas[:10],
}

with open('/tmp/association_result.json', 'w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\nResultado guardado en /tmp/association_result.json")
conn.close()
