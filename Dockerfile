FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG PUBLIC_BITACORA_API_BASE=https://bitacora.trackergps.cloud/src
ENV PUBLIC_BITACORA_API_BASE=$PUBLIC_BITACORA_API_BASE
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
