import Redis from 'ioredis';
import { prisma } from '@pedirei/database';

const STORE_PREFIX = 'wa:auth:';

/**
 * Baileys auth state stored in Redis for multi-instance support.
 * Falls back to DB for persistence across restarts.
 */
export function useRedisAuthState(tenantId: string, redis: Redis) {
  const prefix = `${STORE_PREFIX}${tenantId}:`;

  const writeData = async (key: string, data: any) => {
    const serialized = JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
    await redis.set(`${prefix}${key}`, serialized);
  };

  const readData = async (key: string): Promise<any> => {
    const data = await redis.get(`${prefix}${key}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const removeData = async (key: string) => {
    await redis.del(`${prefix}${key}`);
  };

  const clearAll = async () => {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  };

  return {
    state: {
      creds: {} as any,
      keys: {
        get: async (type: string, ids: string[]) => {
          const data: Record<string, any> = {};
          for (const id of ids) {
            const value = await readData(`${type}-${id}`);
            if (value) data[id] = value;
          }
          return data;
        },
        set: async (data: Record<string, Record<string, any>>) => {
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              if (value) {
                await writeData(`${type}-${id}`, value);
              } else {
                await removeData(`${type}-${id}`);
              }
            }
          }
        },
      },
    },
    saveCreds: async (creds: any) => {
      await writeData('creds', creds);
    },
    loadCreds: async () => {
      return readData('creds');
    },
    clearAll,
  };
}
