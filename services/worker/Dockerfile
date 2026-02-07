FROM node:20-alpine
WORKDIR /app

COPY services/worker/package.json ./services/worker/package.json
COPY shared/common/package.json ./shared/common/package.json

RUN cd services/worker && npm install

COPY services/worker/src ./services/worker/src
COPY shared/common/src ./shared/common/src

CMD ["node", "services/worker/src/worker.js"]
