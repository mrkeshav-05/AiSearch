FROM searxng/searxng

RUN apk add --no-cache curl

COPY settings.yml /usr/local/searxng/searx
COPY limiter.toml /usr/local/searxng/searx