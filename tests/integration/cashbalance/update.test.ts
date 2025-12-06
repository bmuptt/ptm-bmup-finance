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

describe('PUT /api/finance/cash-balance', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
  });

  afterAll(async () => {
    await TestHelper.cleanupAll();
  });

  it('creates cash balance and history on first debit', async () => {
    const response = await request(app)
      .put('/api/finance/cash-balance')
      .set('Cookie', 'token=dummy-token')
      .send({
        status: true,
        value: 1000.5,
        description: 'Initial cash',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Cash balance updated successfully');
    expect(response.body.data).toEqual({
      balance: 1000.5,
    });

    const cash = await prisma.cashBalance.findFirst();
    expect(cash).not.toBeNull();
    expect(Number(cash!.balance)).toBe(1000.5);

    const histories = await prisma.historyBalance.findMany({
      orderBy: { id: 'asc' },
    });
    expect(histories).toHaveLength(1);
    expect(histories[0].status).toBe(true);
    expect(Number(histories[0].value)).toBe(1000.5);
    expect(histories[0].description).toBe('Initial cash');
    expect(histories[0].created_by).toBe(mockUser.id);
  });

  it('updates balance and appends history on credit', async () => {
    await prisma.cashBalance.create({
      data: {
        balance: 1000.5,
      },
    });

    await prisma.historyBalance.create({
      data: {
        status: true,
        value: 1000.5,
        description: 'Initial cash',
        created_by: mockUser.id,
      },
    });

    const response = await request(app)
      .put('/api/finance/cash-balance')
      .set('Cookie', 'token=dummy-token')
      .send({
        status: false,
        value: 200.25,
        description: 'Cash out',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Cash balance updated successfully');
    expect(response.body.data).toEqual({
      balance: 800.25,
    });

    const cash = await prisma.cashBalance.findFirst();
    expect(cash).not.toBeNull();
    expect(Number(cash!.balance)).toBe(800.25);

    const histories = await prisma.historyBalance.findMany({
      orderBy: { id: 'asc' },
    });
    expect(histories).toHaveLength(2);
    const latest = histories[1];
    expect(latest.status).toBe(false);
    expect(Number(latest.value)).toBe(200.25);
    expect(latest.description).toBe('Cash out');
    expect(latest.created_by).toBe(mockUser.id);
  });
}
);

