FROM python:3.12-slim

WORKDIR /app

# Dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencias Python
RUN pip install --no-cache-dir \
    pandas==2.2.3 \
    numpy==2.1.3 \
    scikit-learn==1.5.2 \
    scipy==1.14.1 \
    matplotlib==3.9.2 \
    seaborn==0.13.2 \
    statsmodels==0.14.4 \
    prophet==1.1.6 \
    pymongo==4.10.1 \
    redis==5.2.1 \
    psycopg2-binary==2.9.10 \
    neo4j==5.27.0 \
    fastapi==0.115.6 \
    uvicorn==0.32.1 \
    spacy==3.8.4 \
    networkx==3.4.2 \
    sentence-transformers==3.4.1 \
    pyarrow==18.1.0

# Modelo spaCy para español
RUN python -m spacy download es_core_news_sm

COPY scripts/ /app/scripts/

EXPOSE 8001

CMD ["uvicorn", "scripts.api:app", "--host", "0.0.0.0", "--port", "8001"]
