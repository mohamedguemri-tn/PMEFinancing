FROM node:18-alpine
WORKDIR /app

# gcompat provides glibc compatibility on Alpine/musl — required by some
# native binaries bundled inside ganache and solc
RUN apk add --no-cache libc6-compat gcompat

RUN npm install -g ganache truffle

# Install project dependencies (includes @openzeppelin/contracts)
COPY package*.json ./
RUN npm install

# Copy Solidity source, migrations, and config
COPY . .

# Compile contracts at build time so the entrypoint only needs to migrate
RUN truffle compile

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8545
ENTRYPOINT ["/docker-entrypoint.sh"]
