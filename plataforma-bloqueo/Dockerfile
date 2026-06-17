FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pip3 install --break-system-packages -r requirements.txt
RUN python3 -m playwright install chromium

RUN npm ci
RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "run", "start"]
