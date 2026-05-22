"""
mining_classification.py — Random Forest para predecir alta incidencia oncológica
"""
import psycopg2
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
import json

CONN = "host=localhost port=5434 dbname=oncologia_olap user=oncologia password=oncologia_dev_2026"

conn = psycopg2.connect(CONN)

# Features por departamento
df = pd.read_sql("""
    SELECT g.departamento, MAX(g.zona) as zona,
           SUM(g.casos) as total_casos,
           AVG(g.tasa_por_100k) as tasa_promedio
    FROM dm_geografia g
    WHERE g.año = 2024
    GROUP BY g.departamento
""", conn)

# Agregar % femenino y población
demo = pd.read_sql("""
    SELECT departamento,
           SUM(CASE WHEN sexo='F' THEN casos ELSE 0 END)::float / NULLIF(SUM(casos), 0) * 100 as pct_f
    FROM dm_demografia WHERE año = 2024
    GROUP BY departamento
""", conn)

pop = pd.read_sql("SELECT departamento, total as poblacion FROM poblacion WHERE año = 2024", conn)

merged = df.merge(demo, on='departamento', how='left').merge(pop, on='departamento', how='left')

# Target: alta incidencia (> mediana)
mediana = merged['tasa_promedio'].median()
merged['alta_incidencia'] = (merged['tasa_promedio'] > mediana).astype(int)

# Features
merged['zona_encoded'] = merged['zona'].map({'COSTA': 0, 'SIERRA': 1, 'SELVA': 2})
features = ['pct_f', 'poblacion', 'zona_encoded']
X = merged[features].fillna(0)
y = merged['alta_incidencia']

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

# Random Forest
rf = RandomForestClassifier(n_estimators=100, max_depth=4, random_state=42)
rf.fit(X_train, y_train)

y_pred = rf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred, zero_division=0)

print("=" * 60)
print("CLASIFICACIÓN — Predicción Alta Incidencia Oncológica")
print("=" * 60)
print(f"\nAccuracy: {acc:.3f}")
print(f"F1 Score:  {f1:.3f}")
print(f"\nFeature Importance:")
for name, imp in sorted(zip(features, rf.feature_importances_), key=lambda x: -x[1]):
    print(f"  {name}: {imp:.4f}")

print(f"\nDepartamentos clasificados:")
merged['pred'] = rf.predict(X)
for _, row in merged.iterrows():
    real = "ALTA" if row['alta_incidencia'] == 1 else "BAJA"
    pred = "ALTA" if row['pred'] == 1 else "BAJA"
    icon = "✅" if real == pred else "❌"
    print(f"  {icon} {row['departamento']:20s} real={real:4s} pred={pred:4s}  tasa={row['tasa_promedio']:.1f}")

result = {
    "algoritmo": "Random Forest",
    "parametros": {"n_estimators": 100, "max_depth": 4},
    "accuracy": round(acc, 4),
    "f1_score": round(f1, 4),
    "feature_importance": {name: round(imp, 4) for name, imp in zip(features, rf.feature_importances_)},
    "target": "alta_incidencia (tasa > mediana)",
}

with open('/tmp/classification_result.json', 'w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\nResultado guardado en /tmp/classification_result.json")
conn.close()
