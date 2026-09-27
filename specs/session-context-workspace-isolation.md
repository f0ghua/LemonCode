# ReadSessionContext workspace isolation

## Behavior

`ReadSessionContext` may read only a persisted session belonging to the current runtime workspace. The guard runs after `getSession` and before `messages`, so a rejected target cannot leak transcript content or trigger expensive reads.

## Authority and matching

The current scope comes from `ToolExecutionContext.workspaceIdentity` and `workspaceRoot`. The target scope comes from `SessionInfo.workspaceID` and `directory`.

```text
current identity is non-empty
  => target workspaceID must be the same non-empty identity
  => directory fallback is forbidden

current identity is empty
  => target workspaceID must also be empty
  => normalized local target directory must equal current workspace root
```

This preserves `workspaceIdentity?.trim() || workspacePath` isolation without treating a remote path as an identity. `workingDirectory` is not used because Bash `cd` may change it during a session; `workspaceRoot` is the stable runtime boundary.

## Failure semantics

- Missing and out-of-scope sessions return the same existing `not_found` output.
- The response must not reveal which check failed.
- `sessionStore.messages` must not be called for an out-of-scope target.
- Storage errors for an in-scope target retain the existing structured `failed` behavior.

## Delivery and compatibility

The check runs in core and is independent of `desktop-continuous` versus `web-remote-replayable`; both attach to the same runtime owner. Old local sessions with no identity remain readable by exact local directory. Old remote sessions with no identity are not path-fallback readable from an identified remote workspace; they must first pass the existing identity repair/claim path.

Persisted message rows are append-only. After reading messages, `ReadSessionContext` fetches the target
session metadata again, repeats the same workspace guard, and projects with the refreshed
`SessionInfo.revert` boundary. This ordering fails closed when a rewind commits between the first metadata
read and transcript materialization: the result may conservatively omit a just-created replacement, but
discarded branch text must not reappear in an explicit deep read or in `SessionHistorySearch` discovery.

## Acceptance cases

| ID    | Current                            | Target                             | Expected                                                |
| ----- | ---------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| SI-01 | local, no identity, directory A    | no identity, directory A           | allowed                                                 |
| SI-02 | local, no identity, directory A    | no identity, directory B           | not_found; no message read                              |
| SI-03 | remote identity A, path `/repo`    | identity A, path `/repo`           | allowed                                                 |
| SI-04 | remote identity A, path `/repo`    | identity B, same path              | not_found; no message read                              |
| SI-05 | remote identity A, path `/repo`    | no identity, same path             | not_found; no message read                              |
| SI-06 | local current                      | target has remote identity         | not_found; no message read                              |
| SI-07 | target was rewound                 | discarded branch matches           | discarded text is absent                                |
| SI-08 | rewind commits while messages read | metadata refresh sees new boundary | discarded text is absent; stale snapshot may be omitted |

## Out of scope

Cross-workspace user-authorized import uses the existing shared-context/import flow and is not implemented by weakening this read tool. Session discovery and automatic recall are separate features.
