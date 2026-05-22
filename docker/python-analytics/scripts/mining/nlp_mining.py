"""
nlp_mining.py — Minería de textos clínicos con spaCy
Extrae: entidades, términos frecuentes, sentimiento
Fuente: MongoDB (notas_evolucion, informes_clinicos)
"""
import spacy
from pymongo import MongoClient
from collections import Counter
import json

MONGO_URI = "mongodb://admin:admin_dev_2026@localhost:27018"

nlp = spacy.load("es_core_news_sm")

mongo = MongoClient(MONGO_URI)
db = mongo["oncologia_docs"]

print("=" * 60)
print("NLP — MINERÍA DE TEXTOS CLÍNICOS (spaCy)")
print("=" * 60)

# ── 1. Extraer entidades de informes clínicos ──
print("\n🔍 Análisis de informes clínicos...")
docs = list(db.informes_clinicos.find({}, {"contenido": 1, "palabras_clave": 1, "tipo_informe": 1}).limit(500))

all_entities = Counter()
all_pos = Counter()
cancer_terms = Counter()

MENTIONED = [
    "cáncer", "tumor", "neoplasia", "carcinoma", "metástasis", "biopsia",
    "quimioterapia", "radioterapia", "cirugía", "marcador", "estadio",
    "paciente", "oncológico", "tratamiento", "diagnóstico", "pronóstico",
    "mama", "cérvix", "próstata", "pulmón", "colon", "piel", "estómago",
    "hígado", "leucemia", "linfoma", "páncreas", "riñón"
]

for doc_data in docs[:200]:
    text = doc_data.get("contenido", "")[:2000]
    doc = nlp(text)

    for ent in doc.ents:
        all_entities[f"{ent.label_}:{ent.text}"] += 1

    for token in doc:
        if token.pos_ not in ("PUNCT", "SPACE", "DET", "ADP", "CCONJ"):
            all_pos[token.pos_] += 1

    text_lower = text.lower()
    for term in MENTIONED:
        if term in text_lower:
            cancer_terms[term] += 1

print(f"   {len(docs)} informes procesados")
print(f"\n   🏷️  Top 10 entidades:")
for ent, count in all_entities.most_common(10):
    print(f"      {ent}: {count}")

print(f"\n   📊 POS tagging:")
for pos, count in all_pos.most_common(8):
    print(f"      {pos}: {count}")

print(f"\n   🧬 Términos oncológicos más frecuentes:")
for term, count in cancer_terms.most_common(15):
    print(f"      {term}: {count} docs")

# ── 2. Análisis de sentimiento ──
print("\n💬 Análisis de sentimiento en notas de evolución...")
notes = list(db.notas_evolucion.find({}, {"nota": 1, "sentimiento": 1, "diagnostico_cie10": 1}).limit(500))

sent_count = Counter()
for n in notes:
    s = n.get("sentimiento", "NEUTRAL")
    sent_count[s] += 1

print(f"   {len(notes)} notas analizadas")
print(f"   POSITIVO:  {sent_count.get('POSITIVO', 0)} ({sent_count.get('POSITIVO', 0)/max(len(notes),1)*100:.0f}%)")
print(f"   NEUTRAL:   {sent_count.get('NEUTRAL', 0)} ({sent_count.get('NEUTRAL', 0)/max(len(notes),1)*100:.0f}%)")
print(f"   NEGATIVO:  {sent_count.get('NEGATIVO', 0)} ({sent_count.get('NEGATIVO', 0)/max(len(notes),1)*100:.0f}%)")

# ── 3. Extracción de términos por tipo de cáncer ──
print("\n📊 Frecuencia de términos por tipo de cáncer...")
cancer_terms_detail = {}

for n in notes[:300]:
    cie10 = n.get("diagnostico_cie10", "DESCONOCIDO")
    text = n.get("nota", "").lower()
    if cie10 not in cancer_terms_detail:
        cancer_terms_detail[cie10] = Counter()

    for term in MENTIONED:
        if term in text:
            cancer_terms_detail[cie10][term] += 1

print("   Top términos por código CIE-10:")
for cie, counter in list(cancer_terms_detail.items())[:5]:
    top_terms = counter.most_common(3)
    terms_str = ", ".join(f"{t}({c})" for t, c in top_terms)
    print(f"      {cie}: {terms_str}")

# ── Guardar resultados ──
result = {
    "total_informes": len(docs),
    "total_notas": len(notes),
    "entidades_top10": all_entities.most_common(10),
    "pos_distribution": dict(all_pos.most_common()),
    "cancer_terms_top15": cancer_terms.most_common(15),
    "sentimiento": {
        "POSITIVO": sent_count.get("POSITIVO", 0),
        "NEUTRAL": sent_count.get("NEUTRAL", 0),
        "NEGATIVO": sent_count.get("NEGATIVO", 0),
    },
    "terminos_por_cie10": {k: dict(v.most_common(5)) for k, v in list(cancer_terms_detail.items())[:10]},
}

with open('/tmp/nlp_result.json', 'w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\n✅ NLP completado. Resultados en /tmp/nlp_result.json")
mongo.close()
