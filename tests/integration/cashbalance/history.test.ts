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

describe('GET /api/finance/cash-balance/history', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
  });

  afterAll(async () => {
    await TestHelper.cleanupAll();
  });

  it('returns empty list when no history exists', async () => {
    const response = await request(app)
      .get('/api/finance/cash-balance/history')
      .set('Cookie', 'token=dummy-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      'History balance retrieved successfully',
    );
    expect(response.body.data).toEqual({
      items: [],
      next_cursor: null,
      has_more: false,
    });
  });

  it('returns history in id desc order with cursor pagination and no duplicates', async () => {
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.historyBalance.create({
        data: {
          status: i % 2 === 0,
          value: 100 + i,
          description: `Tx ${i + 1}`,
          created_by: mockUser.id,
        },
      });
    }

    const responsePage1 = await request(app)
      .get('/api/finance/cash-balance/history')
      .query({ limit: 2 })
      .set('Cookie', 'token=dummy-token');

    expect(responsePage1.status).toBe(200);
    expect(responsePage1.body.success).toBe(true);
    expect(responsePage1.body.data.items).toHaveLength(2);

    const page1Items = responsePage1.body.data.items as {
      id: number;
    }[];

    expect(page1Items[0].id).toBeGreaterThan(page1Items[1].id);
    expect(responsePage1.body.data.has_more).toBe(true);
    const nextCursor = responsePage1.body.data.next_cursor as number;
    expect(nextCursor).toBe(page1Items[page1Items.length - 1].id);

    const responsePage2 = await request(app)
      .get('/api/finance/cash-balance/history')
      .query({ limit: 2, cursor: nextCursor })
      .set('Cookie', 'token=dummy-token');

    expect(responsePage2.status).toBe(200);
    expect(responsePage2.body.success).toBe(true);
    expect(responsePage2.body.data.items).toHaveLength(2);

    const page2Items = responsePage2.body.data.items as {
      id: number;
    }[];

    expect(page2Items[0].id).toBeGreaterThan(page2Items[1].id);

    const allIds = [...page1Items, ...page2Items].map((item) => item.id);
    const uniqueIds = Array.from(new Set(allIds));
    expect(uniqueIds).toHaveLength(allIds.length);
  });
});
