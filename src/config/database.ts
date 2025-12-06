import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import apmAgent from './apm';
import { config } from './environment';

// Global variable to store Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

// Base Prisma Client
const basePrismaClient =
  globalThis.__prisma ||
  new PrismaClient({
    adapter,
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Store query information for APM spans
const queryMap = new Map<string, { query: string; params: string; duration?: number }>();

// Listen to query events to capture SQL statements
(basePrismaClient as any).$on('query', (e: any) => {
  const queryKey = `${Date.now()}-${Math.random()}`;
  queryMap.set(queryKey, {
    query: e.query,
    params: e.params,
    duration: e.duration,
  });
  
  // Clean up old entries (keep only last 100)
  if (queryMap.size > 100) {
    const firstKey = queryMap.keys().next().value;
    if (firstKey) queryMap.delete(firstKey);
  }
});

// Prisma Client dengan APM Extension
// Mengikuti pola dari be-app-management yang sudah terbukti bekerja
const prismaWithAPM = basePrismaClient.$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }: {
      model?: string;
      operation: string;
      args: unknown;
      query: (args: unknown) => Promise<unknown>;
    }) => {
      // Nama span: prisma <Model>.<operation>
      const modelName = model ?? 'raw';
      const name = `prisma ${modelName}.${operation}`;

      // Buat span untuk operasi database (skip jika apm tidak ada/testing)
      // APM akan otomatis menambahkan span ke transaksi HTTP yang aktif jika ada
      // Jika tidak ada transaksi aktif, span tidak akan dibuat (yang normal untuk background jobs)
      const span = apmAgent?.startSpan(name, 'db', 'postgresql', operation) ?? null;

      // Log untuk tracing
      if (span) {
        // Check if there's an active transaction
        try {
          let transaction = null;
          if (apmAgent) {
            // Try as function first
            if (typeof apmAgent.currentTransaction === 'function') {
              transaction = apmAgent.currentTransaction();
            } 
            // Try as property
            else if (apmAgent.currentTransaction) {
              transaction = apmAgent.currentTransaction;
            }
          }
        } catch (e) {
          // skip logging to avoid noisy console in tests/production
        }
      }

      try {
        const result = await query(args);
        
        // Set db context dan labels setelah query berhasil
        if (span) {
          // Set db context untuk proper database spans di APM
          const recentQuery = Array.from(queryMap.values()).pop();
          if (recentQuery) {
            // Truncate long queries to avoid too large labels
            const maxLength = 500;
            const queryText = recentQuery.query.length > maxLength 
              ? recentQuery.query.substring(0, maxLength) + '...' 
              : recentQuery.query;
            
            span.setDbContext({
              type: 'postgresql',
              instance: process.env.POSTGRES_DB,
              user: process.env.POSTGRES_USER,
              statement: queryText,
            });
          } else {
            // Set basic db context if no query found
            span.setDbContext({
              type: 'postgresql',
              instance: process.env.POSTGRES_DB,
              user: process.env.POSTGRES_USER,
            });
          }
          
          // Set labels for better filtering in APM
          span.setLabel('model', modelName);
          span.setLabel('operation', operation);
          span.setLabel('success', 'true');
          
          // Catat jumlah record yang diubah (untuk update/delete/createMany)
          const count = (args as any)?.data?.length ?? undefined;
          if (count !== undefined) {
            span.setLabel('items', String(count));
          }
        }
        
        return result;
      } catch (err: any) {
        // Tandai error di span
        if (span) {
          span.setLabel('error', String(err?.message ?? err));
          span.setLabel('success', 'false');
        }
        throw err;
      } finally {
        // End span
        if (span) {
          span.end();
        }
      }
    },
  },
});

// Event listeners removed - using APM spans for monitoring

// In development, store the client in global variable to prevent multiple instances
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = basePrismaClient;
}

// Database connection initialized (no log to reduce production log volume)

export default prismaWithAPM;
