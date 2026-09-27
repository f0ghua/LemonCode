import { recordArmsCustomEventForE2E } from "@zcode/ui";
import {
  DEFAULT_REMOTE_CONTROL_PAIRING_TTL_MS,
  DesktopCommandIds,
  buildLocalMediaPreviewUrl,
  type IPlatformService,
} from "@zcode/shared";

import { desktopBrowserPlatformBridge } from "./desktopBrowserPlatformBridge.js";

// 手机远程控制桥的方法声明在 packages/client/src/globals.d.ts 的 window.zcode 上;
// renderer 仍只经 IPlatformService 消费,不直触私有通道。

export function createDesktopPlatform(options: {
  isLocalDevelopmentRuntime: boolean;
}): IPlatformService {
  return {
    canSelectFilePath: true,
    createLocalMediaPreviewUrl: buildLocalMediaPreviewUrl,
    isLocalDevelopmentRuntime: options.isLocalDevelopmentRuntime,
    selectDirectory: () => window.zcode.selectDirectory(),
    selectFile: () => window.zcode.selectFile(),
    selectFiles: () => window.zcode.selectFiles?.() ?? Promise.resolve([]),
    createTempTextAttachment: (payload) => window.zcode.createTempTextAttachment(payload),
    onRemoteConnectionLog: (handler) => window.zcode.onRemoteConnectionLog(handler),
    onRemoteSessionClosed: (handler) => window.zcode.onRemoteSessionClosed(handler),
    activateOrSetWorkspace: (path) =>
      window.zcode.activateOrSetWorkspace?.(path) ?? Promise.resolve({ activated: false }),
    connectRemote: (remoteOptions, requestId, context) =>
      window.zcode.connectRemote(remoteOptions, requestId, context),
    cancelPendingRemoteConnection: (requestId) =>
      window.zcode.cancelPendingRemoteConnection?.(requestId) ?? Promise.resolve(),
    bindRemoteWorkspaceSessionContext: (context) =>
      window.zcode.bindRemoteWorkspaceSessionContext?.(context) ?? Promise.resolve(),
    disposeRemoteSession: (sessionId) => window.zcode.disposeRemoteSession(sessionId),
    startRemotePairing: window.zcode.startRemotePairing
      ? (request) => window.zcode.startRemotePairing!(request)
      : async () => ({ success: false, error: "not_supported" }),
    stopRemotePairing: window.zcode.stopRemotePairing
      ? () => window.zcode.stopRemotePairing!()
      : async () => {},
    decideRemotePairing: window.zcode.decideRemotePairing
      ? (request) => window.zcode.decideRemotePairing!(request)
      : async () => {},
    onRemotePairingState: window.zcode.onRemotePairingState
      ? (handler) => window.zcode.onRemotePairingState!(handler)
      : () => () => {},
    listRemoteDevices: window.zcode.listRemoteDevices
      ? () => window.zcode.listRemoteDevices!()
      : async () => ({ devices: [] }),
    revokeRemoteDevice: window.zcode.revokeRemoteDevice
      ? (deviceId) => window.zcode.revokeRemoteDevice!(deviceId)
      : async () => {},
    getRemoteControlConfig: window.zcode.getRemoteControlConfig
      ? () => window.zcode.getRemoteControlConfig!()
      : async () => ({
          enabled: false,
          workerBaseUrl: "",
          hasAccessKey: false,
          // 缺省面复用 shared 常量,避免与 main 侧 persistSchema 默认值漂移。
          pairingTtlMs: DEFAULT_REMOTE_CONTROL_PAIRING_TTL_MS,
          allowNewDevices: true,
          idleDisconnectMs: 0,
          pairing: null,
          pairingUrl: null,
        }),
    setRemoteControlConfig: window.zcode.setRemoteControlConfig
      ? (request) => window.zcode.setRemoteControlConfig!(request)
      : async () => ({ success: false, error: "not_supported" }),
    // 可选能力:缺失时保持 undefined,bridge 侧 feature-detect 据此禁用「测试连接」按钮。
    testRemoteControlConnection: window.zcode.testRemoteControlConnection
      ? () => window.zcode.testRemoteControlConnection!()
      : undefined,
    isDockerAvailable: () => window.zcode.isDockerAvailable(),
    listWSLDistros: () => window.zcode.listWSLDistros(),
    listDockerContainers: () => window.zcode.listDockerContainers(),
    listSSHConfigAliases: () => window.zcode.listSSHConfigAliases(),
    loadMcpFromUserDirectory: (payload) => window.zcode.loadMcpFromUserDirectory(payload),
    saveMcpToUserDirectory: (payload) => window.zcode.saveMcpToUserDirectory(payload),
    migrateLegacyCommonMcp: (payload) => window.zcode.migrateLegacyCommonMcp(payload),
    openExternal: (url) => window.zcode.openExternal(url),
    openFeedback: () => window.zcode.executeDesktopCommand(DesktopCommandIds.OpenFeedback),
    openCommunity: () => window.zcode.executeDesktopCommand(DesktopCommandIds.OpenCommunity),
    canOpenCommunity: (locale) => window.zcode.canOpenCommunity(locale),
    openInFileManager: (path) => window.zcode.openInFileManager(path),
    openExternalFile: (path) => window.zcode.openExternalFile(path),
    openCuaPermissionOnboarding: window.zcode.openCuaPermissionOnboarding
      ? (permissionOptions) =>
          window.zcode.openCuaPermissionOnboarding?.(permissionOptions) ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    prepareCuaHelperPermissionDrag: window.zcode.prepareCuaHelperPermissionDrag
      ? () =>
          window.zcode.prepareCuaHelperPermissionDrag?.() ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    startCuaHelperPermissionDrag: window.zcode.startCuaHelperPermissionDrag
      ? () => window.zcode.startCuaHelperPermissionDrag?.()
      : undefined,
    registerOAuthState: (payload) => window.zcode.registerOAuthState(payload),
    onOAuthCallback: (callback) => window.zcode.onOAuthCallback(callback),
    onPaymentCallback: (callback) => window.zcode.onPaymentCallback(callback),
    onShareImport: (callback) => window.zcode.onShareImport?.(callback) ?? (() => {}),
    notifyRendererReady: () => window.zcode.notifyRendererReady(),
    reportTelemetryEvent: (payload) => window.zcode.reportTelemetryEvent(payload),
    reportArmsCustomEvent: (payload) => {
      recordArmsCustomEventForE2E(payload);
      return window.zcode.reportArmsCustomEvent(payload);
    },
    getRendererActionTraceConfig: window.zcode.getRendererActionTraceConfig
      ? () => window.zcode.getRendererActionTraceConfig!()
      : undefined,
    onRendererActionTraceConfigChanged: window.zcode.onRendererActionTraceConfigChanged
      ? (callback) => window.zcode.onRendererActionTraceConfigChanged!(callback)
      : undefined,
    reportLocalTtftBatch: (batch) => window.zcode.reportLocalTtftBatch(batch),
    reportRendererActionTraceBatch: window.zcode.reportRendererActionTraceBatch
      ? (batch) => window.zcode.reportRendererActionTraceBatch!(batch)
      : undefined,
    reportRendererHeapSample: window.zcode.reportRendererHeapSample
      ? (sample) => window.zcode.reportRendererHeapSample!(sample)
      : undefined,
    showTaskNotification: (payload) => window.zcode.showTaskNotification(payload),
    syncWindowTabs: (paths) => window.zcode.syncWindowTabs(paths),
    syncWindowUnreadCount: (count) => window.zcode.syncWindowUnreadCount(count),
    syncActiveTaskSession: (sessionId) => window.zcode.syncActiveTaskSession(sessionId),
    syncAppSettings: (patch) => window.zcode.syncAppSettings?.(patch),
    setShortcutRecordingActive: (active) => window.zcode.setShortcutRecordingActive?.(active),
    onFocusTab: (handler) => window.zcode.onFocusTab(handler),
    onNewTab: (handler) => window.zcode.onNewTab(handler),
    onCloseActiveContextRequest: (handler) =>
      window.zcode.onCloseActiveContextRequest?.(handler) ?? (() => {}),
    onOpenBrowserUrl: (handler) => window.zcode.onOpenBrowserUrl?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfacePrepare: (handler) =>
      window.zcode.onBrowserViewScreenshotSurfacePrepare?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfaceRelease: (handler) =>
      window.zcode.onBrowserViewScreenshotSurfaceRelease?.(handler) ?? (() => {}),
    browserViewScreenshotSurfaceReady: (payload) =>
      window.zcode.browserViewScreenshotSurfaceReady?.(payload),
    ...desktopBrowserPlatformBridge,
    onNewTask: (handler) => window.zcode.onNewTask(handler),
    onOpenWorkspace: (handler) => {
      // 开发态或升级后的旧窗口可能仍运行未暴露 onOpenWorkspace 的 preload，
      // renderer 直接调用会在启动时崩溃。这里和 activateOrSetWorkspace 一样做兼容兜底，
      // 缺少该 bridge 时只禁用原生菜单回调，不影响应用继续打开。
      return window.zcode.onOpenWorkspace?.(handler) ?? (() => {});
    },
    onOpenWorkspacePath: (handler) => window.zcode.onOpenWorkspacePath?.(handler) ?? (() => {}),
    onOpenFeedbackDialog: (handler) => window.zcode.onOpenFeedbackDialog?.(handler) ?? (() => {}),
    onOpenTicketsPanel: (handler) => window.zcode.onOpenTicketsPanel?.(handler) ?? (() => {}),
    onWindowFullscreenChanged: (handler) => window.zcode.onWindowFullscreenChanged(handler),
    getDesktopWindowChromeState: window.zcode.getDesktopWindowChromeState
      ? () => window.zcode.getDesktopWindowChromeState!()
      : undefined,
    onDesktopWindowChromeStateChanged: window.zcode.onDesktopWindowChromeStateChanged
      ? (handler) => window.zcode.onDesktopWindowChromeStateChanged!(handler)
      : undefined,
    getWindowControlsOverlayMetrics: () => window.zcode.getWindowControlsOverlayMetrics?.() ?? null,
    onWindowControlsOverlayChanged: (handler) =>
      window.zcode.onWindowControlsOverlayChanged?.(handler) ?? (() => {}),
    getDesktopZoomLevel: () =>
      window.zcode.getDesktopZoomLevel?.() ?? Promise.resolve({ zoomLevel: 0 }),
    onDesktopZoomLevelChanged: (handler) =>
      window.zcode.onDesktopZoomLevelChanged?.(handler) ?? (() => {}),
    onTaskNotificationClick: (handler) => window.zcode.onTaskNotificationClick(handler),
    exportLogs: () => window.zcode.exportLogs(),
    captureWindowScreenshot: () =>
      window.zcode.captureWindowScreenshot?.() ?? Promise.resolve(null),
    onUpdateReady: (callback) => window.zcode.onUpdateReady(callback),
    onUpdateCheckResult: (callback) => window.zcode.onUpdateCheckResult(callback),
    onUpdateStateChanged: (callback) => window.zcode.onUpdateStateChanged?.(callback) ?? (() => {}),
    getUpdateState: () =>
      window.zcode.getUpdateState?.() ?? Promise.resolve({ kind: "idle", enabled: true }),
    downloadUpdate: () => window.zcode.downloadUpdate?.() ?? Promise.resolve(),
    cancelUpdateDownload: () => window.zcode.cancelUpdateDownload?.() ?? Promise.resolve(),
    openUpdateStatusWindow: () => window.zcode.openUpdateStatusWindow?.() ?? Promise.resolve(),
    getAutoUpdatePreferences: () =>
      window.zcode.getAutoUpdatePreferences?.() ??
      Promise.resolve({ autoDownloadAndInstallUpdates: false }),
    setAutoDownloadAndInstallUpdates: (enabled) =>
      window.zcode.setAutoDownloadAndInstallUpdates?.(enabled) ?? Promise.resolve(),
    getDesktopSessionActivity: () =>
      window.zcode.getDesktopSessionActivity?.() ??
      Promise.resolve({ runningAgentSessionCount: 0 }),
    getZCodeStdioTapDevState: () =>
      window.zcode.getZCodeStdioTapDevState?.() ??
      Promise.resolve({ enabled: false, visible: false, logDir: "", statePath: "" }),
    onSettingsChanged: (callback) => window.zcode.onSettingsChanged?.(callback) ?? (() => {}),
    onApplicationLocaleChanged: (callback) =>
      window.zcode.onApplicationLocaleChanged?.(callback) ?? (() => {}),
    onPostUpdateReleaseNotes: (callback) => window.zcode.onPostUpdateReleaseNotes(callback),
    acknowledgePostUpdateReleaseNotes: (version) =>
      window.zcode.acknowledgePostUpdateReleaseNotes(version),
    skipUpdateVersion: (version) => window.zcode.skipUpdateVersion?.(version) ?? Promise.resolve(),
    quitAndInstallUpdate: () => window.zcode.quitAndInstallUpdate(),
    getInstalledEditors: () => window.zcode.getInstalledEditors(),
    getApplicationIcon: (bundleId) =>
      window.zcode.getApplicationIcon?.(bundleId) ?? Promise.resolve(null),
    openInEditor: (editorId, path, editorOptions) =>
      window.zcode.openInEditor(editorId, path, editorOptions),
    executeDesktopCommand: (command) => window.zcode.executeDesktopCommand(command),
    setApplicationLocale: (locale) => window.zcode.setApplicationLocale(locale),
    getSystemLocale: () =>
      window.zcode.getSystemLocale?.() ??
      Promise.resolve(navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US"),
    setTitleBarTheme: (theme) => window.zcode.setTitleBarTheme(theme),
    getDeviceId: () =>
      (window as Window & { __ZCODE_DEVICE_ID__?: string }).__ZCODE_DEVICE_ID__ ?? "",
  };
}
