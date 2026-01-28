type RedisClient = import('ioredis').default;
export declare function getRedis(): RedisClient | null;
export declare function cacheGet<T>(key: string): Promise<T | null>;
export declare function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
export declare function cacheDel(key: string): Promise<void>;
/** Remove todas as chaves que começam com o prefixo (ex: "product" remove product:*, products:*). */
export declare function cacheDelPattern(prefix: string): Promise<number>;
/** Limpa todo o cache do Redis (autolimpeza periódica). */
export declare function cacheFlush(): Promise<void>;
export {};
//# sourceMappingURL=redis.d.ts.map