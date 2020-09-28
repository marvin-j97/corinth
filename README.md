![Unit tests](https://github.com/dotvirus/corinth/workflows/Unit%20tests/badge.svg)

# Corinth

A portable Rust message queue server with file system persistence (AOF .jsonl format) and a simple Json REST API.

### Run

Grab a pre-compiled binary, and run:

```
(Unix)
./corinth-[version]

(Windows)
corinth-[version].exe
.\corinth-[version].exe
```

That's it. By default the server runs on port 44444.
By using environment variables, you can change some settings:

| Name                | Description                            | Default    |
| ------------------- | -------------------------------------- | ---------- |
| CORINTH_PORT        | Port the server runs on                | 44444      |
| CORINTH_BASE_FOLDER | Folder where persistent data is stored | ./.corinth |

### API Documentation

See https://dotvirus.github.io/corinth/api/.

### Getting started

Create a queue named 'my-queue'

```
curl -X PUT http://localhost:44444/queue/my-queue
```

Enqueue an item to queue

```
curl -X POST http://localhost:44444/queue/my-queue/enqueue -H "Content-Type: application/json" --data "{ \"messages\": [{ \"item\": { \"name\": \"My item\" }, \"deduplication\": null }] }"
```

Dequeue item from queue

```
curl -X POST http://localhost:44444/queue/my-queue/dequeue
```

Acknowledge message reception

```
curl -X POST http://localhost:44444/queue/my-queue/[message id]/ack
```

### Build from source

```
cargo build --release
```

### Roadmap

- See GitHub issues (https://github.com/dotvirus/corinth/issues)
- Node.js API wrapper package
