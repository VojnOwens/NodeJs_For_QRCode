FROM node:14

WORKDIR /qr_generate
COPY package.json .
RUN npm install
COPY . .
CMD npm start
