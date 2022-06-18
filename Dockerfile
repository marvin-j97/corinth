#
# Build stage
#
FROM rust as builder

ENV TARGET=x86_64-unknown-linux-musl

WORKDIR /app
COPY . .

RUN rustup target add ${TARGET}
RUN cargo build --release --target=${TARGET}

#
# Runner stage
#
FROM alpine:latest AS runner

COPY assets assets
COPY dashboard dashboard
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/corinth ./corinth

CMD ["./corinth"]
