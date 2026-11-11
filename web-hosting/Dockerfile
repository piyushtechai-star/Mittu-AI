# Mittu AI web build (Expo export) served by nginx on Cloud Run as mittuai-web.
# Build the files first:  see web-hosting/README.md
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY dist /usr/share/nginx/html
EXPOSE 8080
