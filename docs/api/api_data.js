define({ "api": [
  {
    "type": "post",
    "url": "/queue/:queue/:message/ack",
    "title": "Acknowledge message reception",
    "name": "AckMessage",
    "group": "Queue",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Message not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "post",
    "url": "/queue/:queue/compact",
    "title": "Compact queue file",
    "name": "CompactQueue",
    "group": "Queue",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Queue not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "put",
    "url": "/queue/:queue",
    "title": "Create queue",
    "name": "CreateQueue",
    "group": "Queue",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "query:requeue_time",
            "description": "<p>(Optional) Ack time in seconds</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "query:deduplication_time",
            "description": "<p>(Optional) Deduplication time in seconds</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "query:persistent",
            "description": "<p>(Optional) Set to &quot;true&quot; to make queue persistent</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "query:max_length",
            "description": "<p>(Optional) Queue max length</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "query:dead_letter_queue_name",
            "description": "<p>(Optional) Dead letter queue target</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "query:dead_letter_queue_threshold",
            "description": "<p>(Optional) Dead letter queue requeue threshold (default: 3)</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "400",
            "description": "<p>Invalid time argument</p>"
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "409",
            "description": "<p>Queue already exists</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "delete",
    "url": "/queue/:queue",
    "title": "Delete queue",
    "name": "DeleteQueue",
    "group": "Queue",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Queue not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "post",
    "url": "/queue/:queue/dequeue",
    "title": "Dequeue message(s)",
    "name": "DequeueMessages",
    "group": "Queue",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "query:ack",
            "description": "<p>(Optional) Set to &quot;true&quot; to automatically acknowledge message(s)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "query:amount",
            "description": "<p>(Optional) Amount of items to dequeue and return</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result:items",
            "description": "<p>Dequeued messages</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result:num_items",
            "description": "<p>Amount of dequeued messages</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "400",
            "description": "<p>Invalid amount parameter</p>"
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Queue not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "put",
    "url": "/queue/:queue",
    "title": "Edit queue",
    "name": "EditQueue",
    "group": "Queue",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "body:requeue_time",
            "description": "<p>(Optional) Ack time in seconds</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "body:deduplication_time",
            "description": "<p>(Optional) Deduplication time in seconds</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "body:max_length",
            "description": "<p>(Optional) Queue max length</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "400",
            "description": "<p>Invalid input</p>"
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Queue not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "post",
    "url": "/queue/:queue/enqueue",
    "title": "Enqueue message(s)",
    "name": "EnqueueMessages",
    "group": "Queue",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Array",
            "optional": false,
            "field": "body:messages",
            "description": "<p>List of messages: { item: Object, deduplication: Nullable<String> }</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:num_enqueued",
            "description": "<p>Amount of enqueued messages</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:num_deduplicated",
            "description": "<p>Amount of deduplicated messages</p>"
          },
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result:items",
            "description": "<p>Created messages</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "400",
            "description": "<p>Bad Request</p>"
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Queue not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "get",
    "url": "/queues",
    "title": "List queues",
    "name": "ListQueues",
    "group": "Queue",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "result:queues:items",
            "description": "<p>Queue names</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queues:length",
            "description": "<p>Amount of queues</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "get",
    "url": "/queues",
    "title": "Get queue info",
    "name": "ListQueues",
    "group": "Queue",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "result:queue:name",
            "description": "<p>Queue name</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:created_at",
            "description": "<p>Queue creation unix timestamp</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:size",
            "description": "<p>Queue size (length)</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:num_deduplicating",
            "description": "<p>Amount of tracked deduplication IDs</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:num_unacknowledged",
            "description": "<p>Amount of unacknowledged messages</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:num_acknowledged",
            "description": "<p>Amount of acknowledged (done) messages</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:num_deduplicated",
            "description": "<p>Amount of deduplicated items</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:deduplication_time",
            "description": "<p>Time for deduplication ID to expire</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:requeue_time",
            "description": "<p>Time for an unacknowledged message to get added back into the queue</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:max_length",
            "description": "<p>Queue max length</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "result:queue:persistent",
            "description": "<p>Whether the queue is saved on disk</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:dead_letter:name",
            "description": "<p>Dead letter queue target</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:dead_letter:threshold",
            "description": "<p>Dead letter queue threshold</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:queue:memory_size",
            "description": "<p>Approximate memory usage of the queue</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Queue not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "get",
    "url": "/queue/:queue/peek",
    "title": "Peek queue head",
    "name": "PeekQueue",
    "group": "Queue",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "result:item",
            "description": "<p>Queue head</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Queue not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "delete",
    "url": "/queue/:queue/purge",
    "title": "Purge queue",
    "name": "PurgeQueue",
    "group": "Queue",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404",
            "description": "<p>Queue not found</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Queue"
  },
  {
    "type": "get",
    "url": "/",
    "title": "Get server info",
    "name": "RootInfo",
    "group": "Server",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "result:info:name",
            "description": "<p>Server name</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "result:info:version",
            "description": "<p>Server version</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:info:uptime_ms",
            "description": "<p>Uptime in milliseconds</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:info:uptime_secs",
            "description": "<p>Uptime in seconds</p>"
          },
          {
            "group": "Success 200",
            "type": "Number",
            "optional": false,
            "field": "result:info:started_at",
            "description": "<p>Unix timestamp when the server was started</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Server"
  },
  {
    "type": "post",
    "url": "/close",
    "title": "Shuts down server",
    "name": "ShutdownServer",
    "group": "Server",
    "version": "0.0.0",
    "filename": "src/server.rs",
    "groupTitle": "Server"
  }
] });
