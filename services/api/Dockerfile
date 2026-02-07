FROM node:20-alpine
WORKDIR /app

COPY services/api/package.json ./services/api/package.json
COPY shared/common/package.json ./shared/common/package.json

RUN cd services/api && npm install

COPY services/api/src ./services/api/src
COPY shared/common/src ./shared/common/src

EXPOSE 8080
CMD ["node", "services/api/src/server.js"]
