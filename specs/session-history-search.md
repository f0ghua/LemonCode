# SessionHistorySearch explicit workspace history discovery

## Behavior

`SessionHistorySearch` is a read-only, explicit agent tool that discovers relevant persisted sessions
inside the current workspace. It returns bounded previews and session IDs; the agent uses the existing
`ReadSessionContext` tool for a deliberate deep read of a selected result.

An empty, successful search returns `status: "ok"` with `matches: []`. Missing or failed infrastructure
returns a discriminated `status: "unavailable"`; it must not be disguised as an empty result.

## Ownership and interfaces

- Persisted truth: `SessionStorePort` sessions and messages.
- Candidate query owner: `SessionStorePort.listSessions` with workspace, task-type, archive, and count
  filters.
- Transcript snapshot owner: optional `SessionStorePort.readTranscriptSnapshot`, implemented by the
  production SQLite adapter with bounded message/part/data budgets. Legacy hosts retain the existing
  fail-closed `messages + getSession` compatibility path.
- Projection/ranking owner: pure core session-context search logic.
- Tool orchestration owner: `sessionHistorySearchToolEntry`.
- Deep-read owner: existing `ReadSessionContext`; search never injects transcript content automatically.

No database schema, protocol, UI-specific renderer, runtime cache, network call, or automatic turn
overlay is added. The generic tool-result UI remains in use.

## Workspace and candidate isolation

```text
current workspaceIdentity is non-empty
  → listSessions(workspaceID = trimmed exact identity; no directory fallback)

current workspaceIdentity is empty
  → listSessions(workspaceID = null, directory = stable workspaceRoot)
```

Every returned candidate is checked again with `canReadSessionContextFromWorkspace` before messages are
read. The current session is excluded before `messages()`. Searchable task types are exactly
`interactive`, `fork`, and `workflow_parent`; selection side chats, workflow children, nested children,
and subagent children are not discovery candidates. Archived sessions are excluded.

Workflow actors must disallow both `SessionHistorySearch` and `ReadSessionContext`; otherwise the search
tool would reintroduce the parent/sibling-session enumeration boundary already closed for deep reads.

## Active transcript and searchable projection

Session storage is append-only. When the store supports `readTranscriptSnapshot`, target metadata and a
bounded transcript prefix come from one SQLite read snapshot; scope is revalidated and that same metadata
drives `activeSessionMessages`. The explicit path uses at most 256 message rows, 1,024 part rows, and
262,144 persisted JSON data bytes per candidate. Storage truncation is propagated to the search result.

Legacy stores without the capability retain the prior ordering: read messages, fetch the target
`SessionInfo` again, revalidate workspace/task scope, and only then project. That fallback prevents a
concurrent rewind from pairing newly appended rows with stale branch metadata, although it may omit a
concurrently committed replacement. Discarded rewind branches and superseded compact history are not
searchable. `ReadSessionContext` continues to use the session-aware active-branch helper.

Only these text facts are searchable:

- real, non-synthetic, user-visible user messages; legacy rows carrying a synthetic `source` are rejected
  even when old metadata omitted the `synthetic`/`semantics` fields;
- normal non-summary assistant responses;
- non-ignored, non-synthetic text parts that do not contain system-reminder markup.

Tool calls/results, reasoning, files, subtasks, patches, compaction/control/timeline/retry/step/snapshot
parts, model-only users, hidden transcript semantics, and synthetic notices are excluded.

Session titles are searchable metadata in addition to the eligible transcript projection, so an empty
eligible transcript can still match its title. Titles are capped at 256 characters before ranking and
return. Returned titles and previews are explicitly untrusted background, not instructions. The search
does not create an automatic context overlay or cache entry; its ordinary tool call/result still follows
the existing transcript persistence lifecycle.

## Ranking and budgets

- Candidate sessions loaded from metadata: at most 20, newest first; the store query requests bounded
  lookahead for current-session exclusion and truncation detection.
- Reads are sequential; no `Promise.race` or unbounded `Promise.all` wraps synchronous SQLite work.
- Per-session searchable projection: 32,000 UTF-16 characters.
- Total searchable projection: 256,000 UTF-16 characters.
- Default results: 5; caller may request 1–10.
- Preview: at most 1,200 characters per result.
- Returned/searchable title: at most 256 characters per result.
- Ranking: normalized query phrase plus Latin/number/identifier tokens and Han bigrams; score descending,
  then `updatedAt` descending, then ordinal session ID ascending (independent of host locale/ICU).
- A match must have a positive lexical score; there is no recent-session fallback.

These remain core projection/output budgets. On the production SQLite snapshot path, separate storage
budgets cap admitted persisted JSON payload; `projectedCharacterCount` is still not a SQLite I/O or heap
byte count. The exact storage guarantee and its limits are defined in
`specs/session-transcript-bounded-snapshot.md`.

## Output and failure semantics

`status: "ok"` reports matches plus candidate/scanned session counts, loaded message count,
`projectedCharacterCount`, failed session count, and `truncated`.

`status: "unavailable"` uses stable reason/retryability pairs enforced by the runtime schema:

- `session_store_unavailable`, not retryable;
- `session_list_failed`, retryable;
- `session_messages_failed`, retryable when candidates existed but every transcript/metadata-refresh
  snapshot attempt failed.

Partial transcript-read failure returns available matches with `failedSessionCount > 0` and
`truncated: true`. Cancellation is checked between session reads and is rethrown; the tool does not claim
that an in-progress synchronous SQLite statement is cancellable. Its tool contract therefore supports
cooperative cancellation with no cleanup guarantee. Raw storage errors, workspace identity,
directories, transcript text, filenames, and queries are not written to logs.

The generic tool span owns wall-clock duration and serialized-output truncation telemetry. Structured
output exposes bounded candidate/read/projection/failure counts plus `truncated`; it never emits or logs
the searched transcript as telemetry.

## Event order

```text
explicit tool call
  → validate query/result limit
  → bounded workspace-scoped listSessions
  → exclude current/non-user candidates + recheck workspace
  → sequential bounded transcript snapshot, or legacy messages + metadata refresh
  → recheck workspace/task scope
  → select active branch
  → project eligible text within budgets
  → lexical rank + bounded previews
  → ok / unavailable
  → optional explicit ReadSessionContext(sessionId, focused query)
```

## Acceptance cases

| ID     | Setup/action                                               | Assertions                                                                 |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| SHS-01 | Remote identity A; same-path identity B exists             | Query uses exact A; B is never read                                        |
| SHS-02 | Legacy local workspace                                     | Query uses `workspaceID:null + workspaceRoot`, not working directory       |
| SHS-03 | Current session and child sessions are returned            | All are excluded before `messages()`                                       |
| SHS-04 | Rewound/concurrently rewound session has a discarded match | Refreshed branch boundary is used; discarded text does not match           |
| SHS-05 | Synthetic/control/tool/reasoning text has secrets          | It is absent from search text and previews                                 |
| SHS-06 | Chinese and identifier queries                             | Han/camel/snake tokens rank deterministically                              |
| SHS-07 | No positive lexical match                                  | `ok`, empty matches; no fallback                                           |
| SHS-08 | Store missing/list failure/all reads fail                  | Stable `unavailable` reason and retryability                               |
| SHS-09 | One candidate read fails                                   | Partial `ok`, failed count increments, `truncated=true`                    |
| SHS-10 | Candidate/projection/result/title/preview limits hit       | Every named core budget holds and truncation is reported                   |
| SHS-11 | Cancellation between candidate reads                       | Cancellation propagates; it is not converted to unavailable                |
| SHS-12 | Built-in registration / workflow actor policy              | Main runtime has the tool; workflow actor policy disallows it              |
| SHS-13 | Model formatter                                            | Marks previews untrusted and directs deep reads to `ReadSessionContext`    |
| SHS-14 | ReadSessionContext after rewind                            | Explicit deep read uses the same active branch and excludes discarded text |
| SHS-15 | SQLite bounded snapshot capability                         | Atomic metadata/rows are used and storage truncation propagates            |

## Out of scope

- Automatic prior-session injection, embeddings, vector search, FTS, and database migration.
- Snapshot pagination across concurrent session changes.
- A dedicated UI renderer or registration in the existing `session-context` tool identity family.
- Replacing correctness-critical complete resume/fork/export/deep-read semantics with a truncated prefix;
  that requires a separate pagination contract and is not unfinished search work.
