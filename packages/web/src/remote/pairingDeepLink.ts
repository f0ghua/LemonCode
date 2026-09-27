/**
 * 配对深链解析(cfworker-remote/PROTOCOL.md §5)。
 * URL 形态:`https://<worker域名>/p/<roomId>#c=<capability>`。
 * - roomId 从路径段解析;capability 只从 `location.hash` 的 `c=` 键读取。
 * - fragment 不进任何 HTTP 请求,也不得被复制进 path/query 或上报服务端;
 *   本模块只读不写 URL。
 * - 解析器对未知 hash 键忽略;缺失 `c` 或 roomId 不合法时返回对应 null,
 *   由调用方按 §5 展示配对失败文案。
 */
export interface PairingDeepLinkRoute {
  /** 路径段中的 roomId;不合法时为 null。 */
  roomId: string | null;
  /** hash `c=` 中的 capability;缺失或不合法时为 null。 */
  capability: string | null;
}

export const MOBILE_PAIRING_PATH_PREFIX = "/p/";

// roomId 与 Worker 路由校验同口径(cfworker-remote/src/index.ts:20 的 ROOM_ID_PATTERN
// 8..64;桌面生成 base64url(16)=22 字符):前端放行的 roomId 才能走到 WS 升级拿到
// 语义化 close code,过宽的口径会在 HTTP 升级前被 400 拒绝,只能显示泛化 network 文案。
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
// capability/设备凭据由 Worker 按哈希常量时间校验(cfworker-remote/src/pairing.ts),
// 无路由级长度限制;此处仅做字符集与长度上界的早期筛查。
const PAIRING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export function parsePairingDeepLink(pathname: string, hash: string): PairingDeepLinkRoute | null {
  if (pathname !== "/p" && !pathname.startsWith(MOBILE_PAIRING_PATH_PREFIX)) {
    return null;
  }

  const rawRoomId = pathname.slice(MOBILE_PAIRING_PATH_PREFIX.length).replace(/\/+$/u, "");
  const roomId = ROOM_ID_PATTERN.test(rawRoomId) ? rawRoomId : null;

  // `#c=<capability>`:capability 为 base64url,即使被 encodeURIComponent 过
  // 也由 URLSearchParams 统一解码;未知键(扩展位)忽略。
  const hashParams = new URLSearchParams(hash.replace(/^#/u, ""));
  const rawCapability = hashParams.get("c")?.trim() ?? "";
  const capability = PAIRING_TOKEN_PATTERN.test(rawCapability) ? rawCapability : null;

  return { roomId, capability };
}
