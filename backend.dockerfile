FROM node:alpine

ARG SEARXNG_API_URL
ENV SEARXNG_API_URL=${SEARXNG_API_URL}
RUN apk add --no-cache curl

WORKDIR /home/aisearch/

COPY src /home/aisearch/src

COPY tsconfig.json /home/aisearch/
COPY .env /home/aisearch/
COPY package.json /home/aisearch/
COPY package-lock.json /home/aisearch/

RUN npm install
RUN npm run build

CMD [ "npm", "start" ]