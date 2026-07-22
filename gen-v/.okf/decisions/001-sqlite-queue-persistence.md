# ADR 001: SQLite Queue Persistence Layer

## Context

ShortFactory initially deployed in-memory arrays to manage asynchronous storage uploads and publisher postings. During local server crashes or process restarts, all queued videos were lost. Introducing heavy dependencies like Redis or RabbitMQ at this stage adds unnecessary deployment overhead.

## Decision

We chose to embed **SQLite** (via the synchronous `better-sqlite3` native Node module) as our transactional persistence layer.

## Architecture

1. **Storage/Publish tables**: Track ID, topic, paths, metadata JSON, attempts, and error text.
2. **WAL mode (Write-Ahead Logging)**: Configured via SQLite pragmas to allow concurrent reads and ultra-fast writes without blocking.
3. **Idempotency checks**: Rows are checked against a `jobId + sha256` index prior to network operations to ensure jobs are never duplicated.

## Status

**ACCEPTED** (Phases 2 & 3A).
