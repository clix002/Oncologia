"""
mining_clustering.py — K-means clustering de departamentos por perfil oncológico
"""
import psycopg2
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import json

CONN = "host=localhost port=5434 dbname=oncologia_olap user=oncologia password=oncologia_dev_2026"

conn = psycopg2.connect(CONN)

# Obtener datos por departamento desde dm_geografia
df = pd.read_sql("""
    SELECT departamento, zona, SUM(casos) as total_casos,
           AVG(tasa_por_100k) as tasa_promedio
    FROM dm_geografia
    WHERE año BETWEEN 2022 AND 2024
    GROUP BY departamento, zona
""", conn)

# Pivot: un row por departamento
pivot = df.pivot_table(
    index=['departamento', 'zona'],
    values=['total_casos', 'tasa_promedio'],
    aggfunc='mean'
).reset_index()

# Agregar cols de demografía
demo = pd.read_sql("""
    SELECT departamento, SUM(casos) as total,
           SUM(CASE WHEN sexo='F' THEN casos ELSE 0 END) as casos_f
    FROM dm_demografia
    WHERE año BETWEEN 2022 AND 2024
    GROUP BY departamento
""", conn)

merged = pivot.merge(demo, on='departamento', how='left')
merged['pct_femenino'] = (merged['casos_f'] / merged['total'] * 100).fillna(50)

# Features para clustering
features = ['tasa_promedio', 'total_casos', 'pct_femenino']
X = merged[features].fillna(0)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# K-means con k=4
kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
merged['cluster'] = kmeans.fit_predict(X_scaled)

silhouette = silhouette_score(X_scaled, merged['cluster'])

print("=" * 60)
print("CLUSTERING K-MEANS — Perfiles Oncológicos por Departamento")
print("=" * 60)
print(f"\nSilhouette Score: {silhouette:.3f}")
print(f"\nClusters encontrados (k=4):\n")

for c in sorted(merged['cluster'].unique()):
    deptos = merged[merged['cluster'] == c]
    print(f"  Cluster {c}: {len(deptos)} departamentos")
    print(f"    Tasa promedio: {deptos['tasa_promedio'].mean():.1f}/100k")
    print(f"    % Femenino:    {deptos['pct_femenino'].mean():.1f}%")
    print(f"    Deptos: {', '.join(deptos['departamento'].tolist())}")
    print()

# Guardar resultado
result = {
    "algoritmo": "K-means",
    "parametros": {"k": 4, "features": features},
    "silhouette_score": round(silhouette, 4),
    "departamentos": merged[['departamento', 'zona', 'cluster']].to_dict('records'),
    "centroides": kmeans.cluster_centers_.tolist(),
}

with open('/tmp/clustering_result.json', 'w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Resultado guardado en /tmp/clustering_result.json")
conn.close()
