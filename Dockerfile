FROM node:latest

COPY . .
RUN npm install
EXPOSE 1257
CMD ["node", "index.js"]