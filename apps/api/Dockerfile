FROM node:22.21.1-alpine3.22@sha256:ef30b897b4b924010aab656801cb44fe27589b5d0724ba080b191d75f1f81af0

ARG COMMIT_SHA
ARG BUILD_DATE
ARG BUILD_NUMBER
ARG APP_VERSION

ENV COMMIT_SHA=$COMMIT_SHA
ENV BUILD_DATE=$BUILD_DATE
ENV BUILD_NUMBER=$BUILD_NUMBER
ENV APP_VERSION=$APP_VERSION

LABEL org.opencontainers.image.title="linuxmuster-api" \
      org.opencontainers.image.description="linuxmuster UI — school platform API" \
      org.opencontainers.image.source="https://github.com/faircomp/linuxmuster-ui" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later" \
      org.opencontainers.image.revision="$COMMIT_SHA" \
      org.opencontainers.image.created="$BUILD_DATE" \
      org.opencontainers.image.version="$APP_VERSION"

WORKDIR /opt/edulution/api

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci

COPY ./dist/apps/api/ ./
COPY ./data/public/assets /opt/edulution/api/assets

EXPOSE 3000

CMD ["/bin/sh", "-c", "mkdir -p /opt/edulution/api/data/public/assets && cp -r /opt/edulution/api/assets/* /opt/edulution/api/data/public/assets/ && node ./main.js"]
