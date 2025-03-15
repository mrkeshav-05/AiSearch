FROM searxng/searxng

COPY settings.yml /usr/local/searxng/searx
COPY limiter.toml /usr/local/searxng/searx

RUN apk add --no-cache curl