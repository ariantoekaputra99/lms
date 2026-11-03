# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# The app calls the API on the same origin (/api); nginx proxies it to the backend container.
ARG VITE_API_URL=/api
ARG VITE_PLATFORM_NAME="Akademi LMS"
ENV VITE_API_URL=$VITE_API_URL VITE_PLATFORM_NAME=$VITE_PLATFORM_NAME
RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
