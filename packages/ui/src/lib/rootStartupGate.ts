interface RootStartupGateState {
  isResolvingStartupAuthState: boolean;
  isResolvingProviderStartupState: boolean;
  isRestoring: boolean;
  isBootstrappingInitialWorkspace: boolean;
}

interface RootStartupLoadingVisibilityState extends RootStartupGateState {
  isDesktop: boolean | undefined;
  welcomeScreenOpen: boolean;
}

interface FallbackWorkspaceCreateState {
  isMounted: boolean;
  activeWorkspacePath: string | null;
}

interface ProviderStartupSyncState {
  providerFamilyDomainMigrationComplete: boolean;
  modelSelectionViewHydrated: boolean;
}

interface ProviderStartupResolutionState {
  providerStartupSyncPending: boolean;
  providerAvailabilityStartupCheckCompleted: boolean;
}

export function shouldBlockRootRender(state: RootStartupGateState): boolean {
  return (
    state.isResolvingStartupAuthState ||
    state.isResolvingProviderStartupState ||
    state.isRestoring ||
    state.isBootstrappingInitialWorkspace
  );
}

export function shouldShowRootStartupLoading(state: RootStartupLoadingVisibilityState): boolean {
  // 登录入口是启动门禁的结果，不是可继续被门禁遮挡的后台状态。
  // 如果 WelcomeScreen 已经打开，继续返回启动 loading 会把未登录用户卡在黑屏 logo。
  return Boolean(state.isDesktop) && !state.welcomeScreenOpen && shouldBlockRootRender(state);
}

export interface WebStartupFallbackVisibilityState {
  isDesktop: boolean | undefined;
  hasWorkspaceShell: boolean;
  isSettingsTabActive: boolean;
}

/**
 * Web/手机镜像没有桌面启动 loading 门禁（shouldShowRootStartupLoading 仅桌面生效）：
 * 启动解析（鉴权/provider/会话恢复，手机场景经 CF 桥，RTT 显著放大）完成前没有
 * workspaceShellPath，最终分支若渲染 null 会得到空 RootShell——整页黑屏。
 * 该纯函数判定此时必须以启动页兜底（specs/mobile-remote-control-cf-workers.md「启动渲染门禁」）。
 */
export function shouldRenderWebStartupFallback(state: WebStartupFallbackVisibilityState): boolean {
  return !state.isDesktop && !state.hasWorkspaceShell && !state.isSettingsTabActive;
}

export function shouldEnableProviderAvailabilityLoginEntryGuard(): boolean {
  return true;
}

export function shouldResolveProviderStartupState(state: ProviderStartupResolutionState): boolean {
  return state.providerStartupSyncPending || !state.providerAvailabilityStartupCheckCompleted;
}

export function shouldOpenFallbackWorkspaceAfterCreate(
  state: FallbackWorkspaceCreateState,
): boolean {
  return state.isMounted && !state.activeWorkspacePath;
}

export function isProviderStartupSyncPending(state: ProviderStartupSyncState): boolean {
  return !state.providerFamilyDomainMigrationComplete || !state.modelSelectionViewHydrated;
}
