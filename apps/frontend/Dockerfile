### manifest digest for nginx:1.29.2-alpine3.22 arch:amd64
FROM nginx@sha256:b03ccb7431a2e3172f5cbae96d82bd792935f33ecb88fbf2940559e475745c4e

ARG COMMIT_SHA
ARG BUILD_DATE
ARG BUILD_NUMBER
ARG APP_VERSION

ENV COMMIT_SHA=$COMMIT_SHA
ENV BUILD_DATE=$BUILD_DATE
ENV BUILD_NUMBER=$BUILD_NUMBER
ENV APP_VERSION=$APP_VERSION

LABEL org.opencontainers.image.title="linuxmuster-ui" \
      org.opencontainers.image.description="linuxmuster UI — school platform frontend" \
      org.opencontainers.image.source="https://github.com/faircomp/linuxmuster-ui" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later" \
      org.opencontainers.image.revision="$COMMIT_SHA" \
      org.opencontainers.image.created="$BUILD_DATE" \
      org.opencontainers.image.version="$APP_VERSION"

WORKDIR /usr/share/nginx/html

COPY dist/apps/frontend .

COPY nginx.conf /etc/nginx/nginx.conf

ENTRYPOINT [ "nginx", "-g", "daemon off;" ]
