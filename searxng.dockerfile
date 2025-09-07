# # FROM searxng/searxng

# # RUN apk add --no-cache curl

# # COPY settings.yml /usr/local/searxng/searx
# # COPY limiter.toml /usr/local/searxng/searx

# FROM searxng/searxng:latest

# RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# COPY settings.yml /usr/local/searxng/searx
# COPY limiter.toml /usr/local/searxng/searx

FROM debian:bullseye-slim as builder
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

FROM searxng/searxng:latest
COPY --from=builder /usr/bin/curl /usr/bin/curl
COPY settings.yml /usr/local/searxng/searx
