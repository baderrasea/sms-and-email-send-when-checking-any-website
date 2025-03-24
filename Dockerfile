FROM node:20-bullseye-slim

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production
RUN npx playwright install firefox

COPY . .

ENV NODE_ENV=production
USER node

CMD ["node", "index.js"]