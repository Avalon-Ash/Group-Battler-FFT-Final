# Cloud Run image: serves the prebuilt Vite output (copied into ./dist before deploy).
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
EXPOSE 8080
