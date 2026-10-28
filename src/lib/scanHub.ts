import { Response } from "express";

/**
 * In-memory relay between a phone (scanner) and a POS screen (receiver).
 * Key = organizationId + pairing channel, so one shop can never receive another shop's scans.
 *
 * NOTE: lives in process memory. Fine for a single server instance. If you ever
 * run several instances, swap this for Redis pub/sub (same two functions).
 */
const channels = new Map<string, Set<Response>>();

const keyOf = (orgId: string, channel: string) => `${orgId}:${channel}`;

export function subscribe(orgId: string, channel: string, res: Response) {
  const key = keyOf(orgId, channel);
  if (!channels.has(key)) channels.set(key, new Set());
  channels.get(key)!.add(res);

  return () => {
    const set = channels.get(key);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) channels.delete(key);
  };
}

/** Returns how many POS screens received the scan. */
export function publish(orgId: string, channel: string, payload: unknown) {
  const set = channels.get(keyOf(orgId, channel));
  if (!set) return 0;
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  set.forEach((res) => res.write(message));
  return set.size;
}