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

describe('GET /api/finance/cash-balance', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
  });

  afterAll(async () => {
    await TestHelper.cleanupAll();
  });

  it('returns 0 balance when no record exists', async () => {
    const response = await request(app)
      .get('/api/finance/cash-balance')
      .set('Cookie', 'token=dummy-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Cash balance retrieved successfully',
      data: {
        balance: 0,
      },
    });
  });

  it('returns existing balance when record exists', async () => {
    await prisma.cashBalance.create({
      data: {
        balance: 1000.5,
      },
    });

    const response = await request(app)
      .get('/api/finance/cash-balance')
      .set('Cookie', 'token=dummy-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Cash balance retrieved successfully');
    expect(response.body.data).toEqual({
      balance: 1000.5,
    });
  });
}
);
