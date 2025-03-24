FROM node:20-bullseye

WORKDIR /app

# Install system dependencies required for Firefox
RUN apt-get update && \
    apt-get install -y \
    libdbus-glib-1-2 \
    libxt6 \
    libnss3 \
    libasound2 \
    libgtk-3-0 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install npm dependencies
RUN npm install

# Install Playwright browsers (Firefox only)
RUN npx playwright install firefox

# Copy source files
COPY . .

# Run as non-root user for security
RUN chown -R node:node /app
USER node

CMD ["node", "index.js"]