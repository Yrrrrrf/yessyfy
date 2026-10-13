ARG DB_IMAGE
ARG RUST_VERSION
FROM ${DB_IMAGE} AS tools
FROM rust:${RUST_VERSION}-slim-bookworm AS build
ARG TYPST_VERSION=0.15.0
ARG TYPST_SHA256=59b207df01be2dab9f13e80f73d04d7ff8273ffd46b3dd1b9eef5c60f3eeabea
RUN test "$TYPST_VERSION" = "0.15.0" && apt-get update && apt-get install -y --no-install-recommends curl xz-utils ca-certificates && rm -rf /var/lib/apt/lists/* \
    && curl --fail --location "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" -o /tmp/typst.tar.xz \
    && echo "$TYPST_SHA256  /tmp/typst.tar.xz" | sha256sum -c - \
    && mkdir -p /opt/typst && tar --no-same-owner -xf /tmp/typst.tar.xz --strip-components=1 -C /opt/typst
WORKDIR /app
COPY config/contracts /app/config/contracts
COPY engine /app/engine
RUN cd engine && cargo build --locked --release && mkdir -p /artifacts && chmod 0770 /artifacts
FROM gcr.io/distroless/cc-debian12:nonroot
COPY --from=build /app/engine/target/release/gwa-server /bin/gwa-server
COPY --from=tools /bin/nu /bin/nu
COPY --from=build /opt/typst /opt/typst
COPY --from=build /app/engine/documents /opt/yessyfy/documents
COPY --from=build --chown=65532:65532 /artifacts /artifacts
USER 65532:65532
ENTRYPOINT ["/bin/gwa-server"]



