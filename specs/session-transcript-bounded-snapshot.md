# Bounded atomic session transcript snapshot

## Behavior

`SessionStorePort.readTranscriptSnapshot` is an optional read capability for consumers that need a
bounded view of a persisted transcript. The production SQLite store implements it; older hosts and
test doubles may omit it and continue to use the existing `messages + getSession` compatibility path.

The call returns the target `SessionInfo` and admitted message/part rows from one SQLite read snapshot.
It never mutates the session, creates an index, or caches a second copy of transcript state.

## Ownership and contract

- `SessionStorePort` remains the single owner of persisted session metadata, messages, and parts.
- The SQLite adapter owns row ordering, transaction boundaries, raw stored-data byte accounting, and
  the `truncated` fact.
- Core session-context code owns active-branch selection, searchable-content filtering, lexical ranking,
  and provider-visible character budgets.
- The search service capability-detects `readTranscriptSnapshot`; it must not maintain a second cache or
  issue a metadata refresh after an atomic snapshot.

```text
SessionStore SQLite owner
  -> one read savepoint
       -> SessionInfo
       -> bounded message prefix
       -> bounded parts for admitted messages
  -> SessionTranscriptSnapshot
       -> core active branch / searchable projection / ranking
```

The port accepts required positive limits:

- `maxMessageRows`, clamped by the adapter to 256;
- `maxPartRows`, clamped by the adapter to 1,024;
- `maxDataBytes`, clamped by the adapter to 262,144 bytes.

The byte budget covers the UTF-8 bytes of the persisted message and part JSON `data` columns returned
to JavaScript. It is a hard bound on admitted JSON payload, not a claim about SQLite B-tree page I/O,
index traversal, decoded-object heap size, or fixed row columns.

## Ordering and truncation

Messages use the canonical order `sequence nullness, sequence, time_created, rowid`. Parts for admitted
messages use message order followed by `sequence nullness, sequence, time_created, id`. Reads are
deterministic prefixes:

- one metadata-only lookahead row may be inspected to establish truncation, but its JSON `data` is not
  materialized;
- if the next row would exceed a row or combined byte limit, reading stops and does not skip forward;
- parts are read only for admitted messages;
- `truncated` is true when any message or eligible part row is omitted by a bound;
- a missing session returns `session: null`, no rows, zero counts/bytes, and `truncated: false`.

The result reports admitted message rows, admitted part rows, admitted stored-data bytes, and
`truncated`. These storage counts remain distinct from core `projectedCharacterCount`.

## Atomicity, failure, and cancellation

The SQLite implementation reads metadata, messages, and parts inside one read savepoint. A concurrent
rewind, archive, or workspace change is therefore either wholly before or wholly after the returned
snapshot; core revalidates the returned metadata and applies its rewind boundary to rows from that same
snapshot.

The synchronous SQLite statement cannot be interrupted by `AbortSignal`. Search checks cancellation
between candidate snapshots. Snapshot failure follows the existing per-candidate search failure rules;
partial search results remain available and an all-candidate failure remains
`session_messages_failed`.

Legacy adapters without this optional capability keep the established fail-closed order:
`messages -> getSession -> scope/branch revalidation`. This fallback may omit a concurrent replacement,
but cannot project rows against stale metadata.

## Search budgets

Explicit `SessionHistorySearch` uses the port maxima: 256 messages, 1,024 parts, and 262,144 stored-data
bytes per candidate. Automatic recall uses stricter limits: 96 messages, 384 parts, and 98,304 bytes per
candidate. Either storage truncation or core projection truncation propagates to the existing search
`truncated` output.

## Acceptance cases

| ID    | Setup/action                                       | Assertions                                                                     |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| BTS-1 | Message count exceeds `maxMessageRows`             | Deterministic prefix only; lookahead payload is not returned; `truncated=true` |
| BTS-2 | Part count exceeds `maxPartRows`                   | Parts stop in canonical order; no later part is skipped in; `truncated=true`   |
| BTS-3 | Next JSON row exceeds remaining byte budget        | Combined admitted bytes stay within limit; the row and tail are omitted        |
| BTS-4 | Concurrent metadata/message writer                 | Returned metadata and rows come from one SQLite read snapshot                  |
| BTS-5 | Session does not exist                             | Null session, empty rows, zero counts/bytes, not truncated                     |
| BTS-6 | Search store implements the snapshot capability    | Snapshot is used; legacy `messages/getSession` are not called                  |
| BTS-7 | Search store omits the snapshot capability         | Existing fail-closed compatibility path remains unchanged                      |
| BTS-8 | Automatic recall invokes the shared search service | Stricter storage limits are sent to the same snapshot port                     |

## Migration and rollback

No schema or data migration is required. Rollback removes the optional method and restores the existing
search fallback as the only path. Persisted rows are unchanged.

## Out of scope

- FTS, embeddings, vector search, or a second transcript index.
- Snapshot pagination or random access after the deterministic prefix.
- Cold resume, fork, and export are correctness-critical full-history operations and intentionally keep
  complete reads; silently applying a prefix bound would corrupt their semantics. Explicit deep reads
  likewise remain complete until a separate pagination contract can preserve deliberate access to the
  whole selected session. These are resolved exclusions, not unfinished P1–P4 work.
