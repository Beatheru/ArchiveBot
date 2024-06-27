FROM node:18
WORKDIR /archive
RUN npm install -g pm2
CMD ["pm2-runtime", "--watch", "index.js"]