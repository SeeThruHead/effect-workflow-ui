FROM --platform=$BUILDPLATFORM oven/bun:1.4.2 AS build
ARG TARGETARCH
WORKDIR /src
COPY . .
RUN bun install --frozen-lockfile --ignore-scripts
RUN cd apps/viewer && bun run build
RUN TARGET=$([ "$TARGETARCH" = "arm64" ] && echo bun-linux-arm64 || echo bun-linux-x64) \
  && bun build --compile --target="$TARGET" apps/viewer/src/app/server.ts --outfile /out/viewer

FROM debian:bookworm-slim
COPY --from=build /out/viewer /usr/local/bin/viewer
COPY --from=build /src/apps/viewer/dist/live /srv/viewer
ENV VIEWER_STATIC_DIR=/srv/viewer PORT=4317 HOST=0.0.0.0
USER 10001
EXPOSE 4317
ENTRYPOINT ["/usr/local/bin/viewer"]
