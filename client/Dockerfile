# Stage 1: build
FROM node:18-alpine AS builder
ARG APP_ROOT=client
WORKDIR /app
COPY ${APP_ROOT}/package.json ./package.json
COPY ${APP_ROOT}/pnpm-lock.yaml ./pnpm-lock.yaml

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# copy lock & package for install speed
COPY package.json pnpm-lock.yaml* ./

# install deps and build
COPY ${APP_ROOT}/ ./
RUN pnpm install --frozen-lockfile && pnpm build

# Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# SPA routing config (overwrites default nginx conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
