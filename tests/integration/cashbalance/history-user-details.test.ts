import request from 'supertest';
import app from '../../../src/main';
import prisma from '../../../src/config/database';
import { TestHelper } from '../../test-util';
import { UserProfile } from '../../../src/model';

const mockUser: UserProfile = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  gender: 'M',
  birthdate: '2000-01-01',
  photo: null,
  active: 'Y',
  role_id: 1,
  created_by: 1,
  created_at: new Date().toISOString(),
  updated_by: null,
  updated_at: new Date().toISOString(),
  role: {
    id: 1,
    name: 'Admin',
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_by: null,
    updated_at: new Date().toISOString(),
  },
  iat: Date.now(),
  exp: Date.now() + 3600,
};

jest.mock('../../../src/middleware/auth.middleware', () => {
  const mockAuthMiddleware = (
    req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ): void => {
    req.user = mockUser;
    req.menu = [];
    next();
  };

  return {
    __esModule: true,
    default: mockAuthMiddleware,
    verifyCoreToken: mockAuthMiddleware,
    requireRole: () => mockAuthMiddleware,
    requirePermission: () => mockAuthMiddleware,
  };
});

jest.mock('../../../src/repository/external-user.repository', () => {
  return {
    __esModule: true,
    default: {
      getUsersByIds: async (ids: number[]) =>
        ids.map((id) => ({
          id,
          email: `user${id}@example.com`,
          name: `User ${id}`,
          username: `user${id}`,
          role: { id: 1, name: 'Admin' },
          active: 'Active',
          registered_at: new Date('2024-01-01T00:00:00.000Z').toISOString(),
          contact: null,
        })),
    },
  };
});

describe('GET /api/finance/cash-balance/history with user details', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
  });

  afterAll(async () => {
    await TestHelper.cleanupAll();
  });

  it('attaches created_by_user details for each history item', async () => {
    // Seed history with different creators
    await prisma.historyBalance.create({
      data: {
        status: true,
        value: 150,
        description: 'Tx A',
        created_by: 1,
      },
    });

    await prisma.historyBalance.create({
      data: {
        status: false,
        value: 75,
        description: 'Tx B',
        created_by: 2,
      },
    });

    const response = await request(app)
      .get('/api/finance/cash-balance/history')
      .query({ limit: 10 })
      .set('Cookie', 'token=dummy-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const items = response.body.data.items as Array<{
      id: number;
      created_by: number;
      created_by_user: {
        id: number;
        email: string | null;
        name: string;
        username: string;
        role: { id: number; name: string };
        active: string;
        registered_at: string;
        contact: unknown | null;
      } | null;
    }>;

    expect(items.length).toBeGreaterThanOrEqual(2);
    items.forEach((item) => {
      expect(item.created_by_user).not.toBeUndefined();
      expect(item.created_by_user).not.toBeNull();
      expect(item.created_by_user!.id).toBe(item.created_by);
      expect(item.created_by_user!.email).toBe(`user${item.created_by}@example.com`);
    });
  });
});

