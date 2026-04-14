FROM node:22-alpine AS base

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY backend/src ./src
COPY backend/db ./db
COPY backend/scripts ./scripts
COPY backend/.env.example ./.env.example
COPY frontend /frontend

EXPOSE 5000

CMD ["node", "src/server.js"]
