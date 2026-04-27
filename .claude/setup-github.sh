#!/bin/bash
# Script de configuración de credenciales GitHub para el entorno de desarrollo
# Ejecutar al inicio de cada sesión si se necesita hacer git push desde la máquina local

git config --global credential.helper store
echo "https://HCANO10:${GITHUB_PAT}@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
echo "✅ Credenciales GitHub configuradas correctamente."
