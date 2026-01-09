FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src
RUN npm run prisma:generate
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh","-c","node src/infraestructura/wait-for-db.js && npx prisma migrate deploy && node src/servidor.js"]
