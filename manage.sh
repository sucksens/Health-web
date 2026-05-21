#!/bin/bash
set -e

VERSION_FILE=".env.version"
source "$VERSION_FILE"

echo "=== Health App v${VERSION} ==="
echo ""

if [ "$1" = "publish" ]; then
    REGISTRY="${2:-}"
    if [ -z "$REGISTRY" ]; then
        echo "Uso: $0 publish <registry>/<namespace>"
        echo "Ejemplo: $0 publish dockerhubuser"
        echo "Ejemplo: $0 publish ghcr.io/myorg"
        exit 1
    fi

    echo "Construyendo imagenes v${VERSION}..."
    docker compose --env-file "$VERSION_FILE" build

    echo "Etiquetando imagenes..."
    docker tag "health-backend:${VERSION}" "${REGISTRY}/health-backend:${VERSION}"
    docker tag "health-backend:${VERSION}" "${REGISTRY}/health-backend:latest"
    docker tag "health-frontend:${VERSION}" "${REGISTRY}/health-frontend:${VERSION}"
    docker tag "health-frontend:${VERSION}" "${REGISTRY}/health-frontend:latest"

    echo "Publicando imagenes..."
    docker push "${REGISTRY}/health-backend:${VERSION}"
    docker push "${REGISTRY}/health-backend:latest"
    docker push "${REGISTRY}/health-frontend:${VERSION}"
    docker push "${REGISTRY}/health-frontend:latest"

    echo ""
    echo "Imagenes publicadas:"
    echo "  ${REGISTRY}/health-backend:${VERSION}"
    echo "  ${REGISTRY}/health-frontend:${VERSION}"
elif [ "$1" = "build" ]; then
    echo "Construyendo imagenes v${VERSION}..."
    docker compose --env-file "$VERSION_FILE" up -d --build
    echo ""
    echo "Imagenes construidas:"
    echo "  health-backend:${VERSION}"
    echo "  health-frontend:${VERSION}"
    echo ""
    echo "Contenedores iniciados."
elif [ "$1" = "upgrade" ]; then
    echo "Actualizando sin perder datos..."
    docker compose --env-file "$VERSION_FILE" up -d --build
    echo ""
    echo "Upgrade completado. Datos preservados."
else
    echo "Comandos disponibles:"
    echo "  $0 build     - Construir e iniciar contenedores"
    echo "  $0 upgrade   - Actualizar sin perder datos (mismo que build)"
    echo "  $0 publish   - Publicar imagenes a un registry"
    echo ""
    echo "Version actual: ${VERSION}"
    echo "Para cambiar version: editar VERSION y .env.version"
fi
