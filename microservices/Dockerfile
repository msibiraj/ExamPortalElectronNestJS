# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Which app to build (api-gateway | auth-service | question-service | exam-service | monitor-service)
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .
RUN npm run build:$(echo $SERVICE_NAME | sed 's/api-gateway/gateway/;s/auth-service/auth/;s/question-service/questions/;s/exam-service/exam/;s/monitor-service/monitor/')

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps

COPY --from=builder /app/dist ./dist

CMD node dist/apps/${SERVICE_NAME}/main
