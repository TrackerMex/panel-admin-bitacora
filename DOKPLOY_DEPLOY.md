# Deploy en Dokploy - Panel Admin

Este proyecto se despliega como el servicio `admin` dentro del proyecto `tracker`.

## Servicio

- Build type: `Dockerfile`
- Dockerfile path: `Dockerfile`
- Port interno: `80`
- Dominio recomendado: `admin.trackergps.cloud`
- URL de la app: `https://admin.trackergps.cloud/`

## Build args / variables

Configura en Dokploy el build arg:

- `PUBLIC_BITACORA_API_BASE=https://bitacora.trackergps.cloud/bitacora_/src`

Astro inyecta `PUBLIC_BITACORA_API_BASE` durante el build, por eso debe existir antes de construir la imagen.

## Validación

```bash
docker build \
  --build-arg PUBLIC_BITACORA_API_BASE=https://bitacora.trackergps.cloud/bitacora_/src \
  -t bitacora-admin:latest .

docker run --rm -p 8082:80 bitacora-admin:latest
```

Revisar:

- `http://localhost:8082/login`
- `http://localhost:8082/dashboard`
- Login admin consumiendo `https://bitacora.trackergps.cloud/bitacora_/src/usuarios/login.php`
