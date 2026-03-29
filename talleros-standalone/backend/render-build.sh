#!/bin/bash
# Script de build para Render - fuerza reinstalación limpia

echo "=== TallerOS Build Script ==="
echo "Cleaning node_modules..."
rm -rf node_modules package-lock.json

echo "Installing dependencies..."
npm install

echo "Rebuilding native modules..."
npm rebuild

echo "Build complete!"
