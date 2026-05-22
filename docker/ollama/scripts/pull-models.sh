#!/bin/bash
# Descarga los modelos necesarios para el proyecto
# Se ejecuta al iniciar el contenedor Ollama

echo "Pulling Ollama models..."

# Embeddings locales (ligeros, ~270 MB)
echo "[1/2] Pulling nomic-embed-text (embeddings)..."
ollama pull nomic-embed-text:latest

# Chat local (ligero, ~2 GB)
echo "[2/2] Pulling gemma3:1b (chat local)..."
ollama pull gemma3:1b

echo "All models pulled successfully."
echo "Available models:"
ollama list
