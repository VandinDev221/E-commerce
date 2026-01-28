import Redis from 'ioredis';
import { config } from '../config/index.js';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  // Se não houver URL configurada, Redis fica desabilitado (evita timeouts em dev).
  if (!config.redis.url) return null;
  if (redis) return redis;
  try {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });
    // Se der erro de conexão, desabilita Redis para as próximas chamadas.
    redis.on('error', () => {
      redis?.disconnect();
      redis = null;
    });
    return redis;
  } catch {
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const data = await client.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // ignore
  }
}

/** Remove todas as chaves que começam com o prefixo (ex: "product" remove product:*, products:*). */
export async function cacheDelPattern(prefix: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  let removed = 0;
  try {
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) {
        await client.del(...keys);
        removed += keys.length;
      }
    } while (cursor !== '0');
  } catch {
    // ignore
  }
  return removed;
}

/** Limpa todo o cache do Redis (autolimpeza periódica). */
export async function cacheFlush(): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.flushdb();
  } catch {
    // ignore
  }
}
