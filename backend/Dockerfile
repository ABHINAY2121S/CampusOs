FROM node:20-alpine

WORKDIR /app

# Install deps first for layer caching
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY . .

EXPOSE 4000

# On startup: push schema → seed (idempotent) → start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run db:seed && npm run dev"]
