FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN mkdir -p data
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]