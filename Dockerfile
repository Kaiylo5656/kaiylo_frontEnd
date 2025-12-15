# Frontend Dockerfile
# Vite 7 requires Node.js 20.19+ or 22.12+
FROM node:20-alpine

# Installer wget pour les healthchecks
RUN apk add --no-cache wget

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 5173

# Commande par défaut (peut être surchargée par docker-compose)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

