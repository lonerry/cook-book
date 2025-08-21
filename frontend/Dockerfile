FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
COPY frontend/vite.config.ts ./vite.config.ts
COPY frontend/tailwind.config.js ./tailwind.config.js
COPY frontend/postcss.config.js ./postcss.config.js
RUN npm ci
COPY frontend /app
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


