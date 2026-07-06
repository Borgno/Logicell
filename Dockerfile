# Estágio 1: Dependências e Build
FROM node:22-alpine AS builder

# Instala dependências nativas necessárias para compilação (ex: bcrypt, prisma) e OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

# Copia o package.json e package-lock.json
COPY package.json package-lock.json* ./

# Instala as dependências (incluindo devDependencies para rodar o build)
RUN npm ci

# Copia a pasta prisma e gera o client antes do build do código
COPY prisma ./prisma
RUN npx prisma generate

# Copia o resto do código da aplicação
COPY . .

# Roda o build do React Router v7
RUN npm run build

# Limpa dependências de desenvolvimento para economizar espaço
RUN npm prune --production

# ==========================================
# Estágio 2: Runner de Produção
FROM node:22-alpine AS runner

# O Prisma pode precisar do OpenSSL nativo mesmo na imagem de produção
RUN apk add --no-cache openssl

WORKDIR /app

# Define variáveis de ambiente de produção
ENV NODE_ENV="production"
ENV PORT=3000

# Copia os node_modules (que agora têm apenas dependências de prod e o Prisma Client)
COPY --from=builder /app/node_modules ./node_modules

# Copia as pastas de build geradas, assets públicos e o schema do Prisma
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Expõe a porta padrão
EXPOSE 3000

# O comando npm run start roda "react-router-serve ./build/server/index.js"
CMD ["npm", "run", "start"]
