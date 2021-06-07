FROM rust as builder

WORKDIR /usr/src/app
COPY . .

RUN cargo build --release

FROM debian:buster-slim

# We just need the build to execute the command
COPY assets assets
COPY dashboard dashboard
COPY --from=builder /usr/src/app/target/release ./release

CMD ["./release/corinth"]
