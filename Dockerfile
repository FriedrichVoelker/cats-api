FROM node:latest-alpine

COPY . .
RUN npm install

CMD ["node", "index.js"]