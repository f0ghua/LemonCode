import assert from "node:assert/strict";
import test from "node:test";
import { shouldRenderWebStartupFallback, shouldShowRootStartupLoading } from "./rootStartupGate.js";

test("shouldRenderWebStartupFallback: web 无工作区/无设置页时兜底启动页", () => {
  assert.equal(
    shouldRenderWebStartupFallback({
      isDesktop: false,
      hasWorkspaceShell: false,
      isSettingsTabActive: false,
    }),
    true,
  );
  assert.equal(
    shouldRenderWebStartupFallback({
      isDesktop: undefined,
      hasWorkspaceShell: false,
      isSettingsTabActive: false,
    }),
    true,
  );
});

test("shouldRenderWebStartupFallback: 桌面或已有内容时不兜底", () => {
  // 桌面保持既有行为(启动 loading 门禁/welcome 覆盖),不走 web 兜底
  assert.equal(
    shouldRenderWebStartupFallback({
      isDesktop: true,
      hasWorkspaceShell: false,
      isSettingsTabActive: false,
    }),
    false,
  );
  assert.equal(
    shouldRenderWebStartupFallback({
      isDesktop: false,
      hasWorkspaceShell: true,
      isSettingsTabActive: false,
    }),
    false,
  );
  assert.equal(
    shouldRenderWebStartupFallback({
      isDesktop: false,
      hasWorkspaceShell: false,
      isSettingsTabActive: true,
    }),
    false,
  );
});

test("shouldShowRootStartupLoading: 仅桌面显示启动门禁(回归锚点)", () => {
  assert.equal(
    shouldShowRootStartupLoading({
      isDesktop: true,
      welcomeScreenOpen: false,
      isResolvingStartupAuthState: true,
      isResolvingProviderStartupState: false,
      isRestoring: false,
      isBootstrappingInitialWorkspace: false,
    }),
    true,
  );
  // web 无门禁:黑屏由 shouldRenderWebStartupFallback 兜底
  assert.equal(
    shouldShowRootStartupLoading({
      isDesktop: false,
      welcomeScreenOpen: false,
      isResolvingStartupAuthState: true,
      isResolvingProviderStartupState: false,
      isRestoring: false,
      isBootstrappingInitialWorkspace: false,
    }),
    false,
  );
});
