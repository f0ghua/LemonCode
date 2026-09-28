import assert from "node:assert/strict";
import test from "node:test";
import { appSettingsPatchSchema, appSettingsSchema } from "./validationAppSettings.js";

test("automatic git commit message generation defaults off and accepts an explicit patch", () => {
  assert.equal(appSettingsSchema.parse({}).autoGenerateGitCommitMessage, false);
  assert.deepEqual(appSettingsPatchSchema.parse({ autoGenerateGitCommitMessage: true }), {
    autoGenerateGitCommitMessage: true,
  });
});
