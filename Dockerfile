FROM node:20-bullseye-slim

# Install runtime dependencies required for Puppeteer (Chromium)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libxtst6 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies (Puppeteer downloads Chromium automatically)
COPY package*.json ./
RUN npm install --production

# Optional: Force installation of Chromium (if needed)
RUN npx puppeteer install

# Copy remaining application code
COPY . .

ENV NODE_ENV=production
USER node

CMD ["node", "index.js"]
