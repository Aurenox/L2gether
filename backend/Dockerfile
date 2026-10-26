FROM node:20-bookworm-slim

# Install GCC, G++, build-essential, and Python 3 for native execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package*.json ./
RUN npm install --production

# Copy source code and database migrations
COPY . .

# Default production configuration (Render injects PORT dynamically)
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

# Start L2gether server
CMD ["node", "src/server.js"]
