"""
API de Analytics para Oncología BI Dashboard
Proporciona endpoints de minería de datos, NLP y forecasting.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Analytics API iniciada")
    yield
    # Shutdown
    print("Analytics API detenida")


app = FastAPI(
    title="Oncología Analytics API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "analytics"}


@app.get("/mining/clustering")
def mining_clustering():
    """K-means clustering de departamentos por perfil oncológico"""
    return {"status": "pending", "method": "kmeans"}


@app.get("/mining/association")
def mining_association():
    """Reglas de asociación: patrones de comorbilidad"""
    return {"status": "pending", "method": "apriori"}


@app.get("/forecast")
def forecast(departamento: str = "AYACUCHO", años: int = 3):
    """Forecasting de casos oncológicos (Prophet)"""
    return {"status": "pending", "departamento": departamento, "años": años}


@app.get("/nlp/analyze")
def nlp_analyze(texto: str):
    """Análisis de texto clínico con spaCy"""
    return {"status": "pending", "texto": texto}
