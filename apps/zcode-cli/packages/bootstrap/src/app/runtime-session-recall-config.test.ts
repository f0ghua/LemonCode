import assert from "node:assert/strict";
import test from "node:test";
import type { ConfigResult } from "@zcode/adapters/config";
import { DefaultRuntimeConfig } from "@zcode/contracts";
import type { ZCodeAppOptions } from "./types.js";
import { resolveAppRuntimeConfig } from "./runtime-config.js";

test("bootstrap maps scoped session recall config and preserves explicit runtime override", () => {
  const enabledByConfig = resolve({ configEnabled: true });
  assert.equal(enabledByConfig.sessionRecall?.enabled, true);

  const disabledByRuntime = resolve({ configEnabled: true, runtimeEnabled: false });
  assert.equal(disabledByRuntime.sessionRecall?.enabled, false);

  const enabledByRuntime = resolve({ configEnabled: false, runtimeEnabled: true });
  assert.equal(enabledByRuntime.sessionRecall?.enabled, true);
});

function resolve(input: { configEnabled: boolean; runtimeEnabled?: boolean }) {
  return resolveAppRuntimeConfig({
    cliStorageRoot: "C:\\zcode-cli",
    configResult: {
      config: {
        ...DefaultRuntimeConfig,
        sessionRecall: { enabled: input.configEnabled },
      },
    } as ConfigResult,
    options: {
      runtimeConfig:
        input.runtimeEnabled === undefined
          ? undefined
          : { sessionRecall: { enabled: input.runtimeEnabled } },
    } as ZCodeAppOptions,
    subagentOutputRootDir: "C:\\zcode-cli\\agents",
    workingDirectory: "C:\\workspace",
  }).runtimeConfig;
}
