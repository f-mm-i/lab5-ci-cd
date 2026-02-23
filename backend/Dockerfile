FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=10 \
  CMD curl -fsS http://localhost:3000/api/v1/health || exit 1
CMD ["npm", "start"]
