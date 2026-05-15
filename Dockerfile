FROM node:22-alpine AS build

WORKDIR /app

ARG PUBLIC_BITACORA_API_BASE=https://bitacora.trackergps.cloud/bitacora_/src
ENV PUBLIC_BITACORA_API_BASE=$PUBLIC_BITACORA_API_BASE

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
