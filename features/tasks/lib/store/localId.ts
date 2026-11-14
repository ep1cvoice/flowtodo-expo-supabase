/**
 * Client-generated bigint ids (ms timestamp * 1024 + random) stay below 2^53 and never
 * collide with the server's small identity values. Ids are globally unique on the server, so a
 * rare cross-user collision is possible; the sync engine detects it and re-ids the row.
 */
let lastId = 0;
export function newLocalId(): number {
  const candidate = Date.now() * 1024 + Math.floor(Math.random() * 1024);
  lastId = candidate > lastId ? candidate : lastId + 1;
  return lastId;
}
