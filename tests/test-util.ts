import dotenv from 'dotenv';
import prisma from '../src/config/database';

dotenv.config();

export class TestHelper {
  /**
   * Migrate dan seed ulang database untuk setiap test case.
   */
  static async refreshDatabase() {
    await prisma.membershipDues.deleteMany();
    await prisma.historyBalance.deleteMany();
    await prisma.cashBalance.deleteMany();
  }

  /**
   * Cleanup database setelah test.
   * Placeholder: saat ini tidak ada data domain yang perlu dibersihkan.
   */
  static async cleanupDatabase() {
    // No-op for now; kept for future integration tests
  }

  /**
   * Cleanup database connection
   */
  static async cleanupConnection() {
    await prisma.$disconnect();
  }

  /**
   * Cleanup all resources (database, APM, server)
   */
  static async cleanupAll() {
    try {
      // Cleanup database connection
      await this.cleanupConnection();

      // Cleanup server if exists
      try {
        type MainModule = typeof import('../src/main');
        const { server } = require('../src/main') as MainModule;

        if (server && typeof server.close === 'function') {
          await new Promise<void>((resolve) => {
            server.close(() => {
              resolve();
            });
          });
        }
      } catch {
        // Server might not be initialized in testing
      }

      // Cleanup APM if exists
      try {
        type ApmModule = typeof import('../src/config/apm');
        const apmModule = require('../src/config/apm') as ApmModule;
        const apm = apmModule.default as { destroy?: () => void } | undefined;

        if (apm && typeof apm.destroy === 'function') {
          apm.destroy();
        }
      } catch {
        // APM might not be initialized in testing
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    } catch {
      // Swallow cleanup errors to avoid masking test failures
    }
  }
}
