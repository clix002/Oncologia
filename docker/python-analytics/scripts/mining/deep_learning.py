"""
deep_learning.py — Red Neuronal (MLP) para predicción de incidencia oncológica
"""
import psycopg2
import pandas as pd
import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score
import json

CONN = "host=localhost port=5434 dbname=oncologia_olap user=oncologia password=oncologia_dev_2026"
conn = psycopg2.connect(CONN)

print("=" * 60)
print("DEEP LEARNING — Red Neuronal Predicción Incidencia")
print("=" * 60)

# Datos: features por departamento
df_geo = pd.read_sql("""
    SELECT departamento, SUM(casos) as total, AVG(tasa_por_100k) as tasa
    FROM dm_geografia WHERE año=2024 GROUP BY departamento
""", conn)

df_demo = pd.read_sql("""
    SELECT departamento,
           SUM(CASE WHEN sexo='F' THEN casos ELSE 0 END)*100.0/NULLIF(SUM(casos),0) as pct_f
    FROM dm_demografia WHERE año=2024 GROUP BY departamento
""", conn)

pop = pd.read_sql("SELECT departamento, total as poblacion FROM poblacion WHERE año=2024", conn)

merged = df_geo.merge(df_demo, on='departamento').merge(pop, on='departamento', how='inner').dropna()

# Target: alta (> mediana) vs baja incidencia
mediana = merged['tasa'].median()
merged['alta'] = (merged['tasa'] > mediana).astype(int)

X = merged[['total', 'pct_f', 'poblacion']].values
y = merged['alta'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)

# ── Red Neuronal (MLP) ──
mlp = MLPClassifier(
    hidden_layer_sizes=(16, 8, 4),  # 3 capas ocultas
    activation='relu',
    solver='adam',
    max_iter=2000,
    random_state=42,
    early_stopping=True,
    validation_fraction=0.2,
)

mlp.fit(X_train_s, y_train)
y_pred = mlp.predict(X_test_s)

acc = accuracy_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred, zero_division=0)

print(f"\n🧠 Arquitectura: {mlp.hidden_layer_sizes}")
print(f"   Capas ocultas: {mlp.n_layers_ - 1}")
print(f"   Neuronas total: {sum(mlp.hidden_layer_sizes)}")
print(f"   Iteraciones: {mlp.n_iter_}")
print(f"\n📊 Resultados:")
print(f"   Accuracy:  {acc:.3f}")
print(f"   F1 Score:  {f1:.3f}")
print(f"   Mejor loss: {mlp.best_loss_ or mlp.loss_:.4f}")

print(f"\n   Predicciones:")
for i, (_, row) in enumerate(merged.iterrows()):
    x = scaler.transform([[row['total'], row['pct_f'], row['poblacion']]])
    pred = mlp.predict(x)[0]
    real = "ALTA" if row['alta'] == 1 else "BAJA"
    pred_str = "ALTA" if pred == 1 else "BAJA"
    icon = "✅" if real == pred_str else "❌"
    print(f"   {icon} {row['departamento']:20s} real={real:4s} pred={pred_str:4s}  tasa={row['tasa']:.1f}")

result = {
    "modelo": "MLP (Red Neuronal)",
    "arquitectura": str(mlp.hidden_layer_sizes),
    "capas_ocultas": mlp.n_layers_ - 1,
    "neuronas": sum(mlp.hidden_layer_sizes),
    "iteraciones": mlp.n_iter_,
    "accuracy": round(acc, 4),
    "f1_score": round(f1, 4),
    "loss": round(mlp.best_loss_ or 0, 4),
    "features": ["total_casos", "pct_femenino", "poblacion"],
}

with open('/tmp/deep_learning_result.json', 'w') as f:
    json.dump(result, f, indent=2)

print(f"\n✅ Deep Learning completado.")
conn.close()
