FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./

# Install npm dependencies
RUN npm install

# Update package lists and install Playwright with system dependencies
RUN apt-get update && \
    npx playwright install --with-deps firefox && \
    rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["node", "index.js"]