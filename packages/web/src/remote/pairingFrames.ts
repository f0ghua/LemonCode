/**
 * Worker 控制帧解析与关闭码映射(cfworker-remote/PROTOCOL.md §2/§3.2)。
 * 手机侧只消费 TEXT 控制帧、不产生配对控制帧;凭据校验失败的原因不区分
 * "过期/错误/重放"(§4.3 防枚举),统一映射到失效文案。
 */

export type PairingFailureKey =
  | "network"
  | "timeout"
  | "auth"
  | "protocol"
  | "room-missing"
  | "expired"
  | "invalidated"
  | "stopped"
  | "busy"
  | "heartbeat"
  | "bridge-timeout"
  | "invalid-link"
  | "rejected"
  | "worker-error";

export interface PairingWorkerFrame {
  type: string;
  requestId?: unknown;
  deviceId?: unknown;
  deviceCredential?: unknown;
  reason?: unknown;
  code?: unknown;
  message?: unknown;
}

/**
 * 解析一条 TEXT 控制帧。二进制消息(桥接数据帧)与非 JSON 文本一律返回 null,
 * 不抛错——控制帧解析失败不能影响数据通道。
 */
export function parsePairingControlFrame(raw: unknown): PairingWorkerFrame | null {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.type !== "string") {
      return null;
    }
    return { ...candidate, type: candidate.type };
  } catch {
    return null;
  }
}

/** Worker 语义化关闭码(§3.2)→ 失败文案 key;未知/网络层关闭统一按 network。 */
export function describePairingClose(code: number): PairingFailureKey {
  switch (code) {
    case 4001:
      return "heartbeat";
    case 4002:
      return "auth";
    case 4003:
      return "protocol";
    case 4004:
      return "room-missing";
    case 4005:
      return "expired";
    case 4006:
      return "invalidated";
    case 4007:
      return "stopped";
    case 4008:
      return "busy";
    default:
      return "network";
  }
}
