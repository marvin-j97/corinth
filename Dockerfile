FROM rust

WORKDIR /usr/src/corinth
COPY . .

RUN cargo install --path .

CMD ["corinth"]