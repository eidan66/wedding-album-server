# base image
FROM node:22-alpine

# set working directory
WORKDIR /app

# copy files
COPY package.json yarn.lock ./
COPY tsconfig.json ./
COPY src ./src

# install dependencies
RUN yarn install --frozen-lockfile

# build the app
RUN yarn build

# expose port
EXPOSE 3000

# start the server
CMD ["yarn", "start"]