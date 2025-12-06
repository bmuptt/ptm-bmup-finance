import request from 'supertest';
import app from '../../../src/main';
import prisma from '../../../src/config/database';
import { TestHelper } from '../../test-util';
import { UserProfile, SettingMember } from '../../../src/model';

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
    req: import('express').Request & { user?: import('../../../src/model').UserProfile; menu?: import('../../../src/model').Menu[] },
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

jest.mock('../../../src/repository/setting-member.repository', () => {
  const mockMember: SettingMember = {
    id: 123,
    user_id: 999,
    name: 'John Doe',
    username: 'johndoe',
    gender: 'Male',
    birthdate: new Date('1990-01-01T00:00:00.000Z').toISOString(),
    address: 'Jl. Contoh No. 123, Jakarta',
    phone: '081234567890',
    photo: 'http://localhost:3200/storage/images/members/photo-1234567890.jpg',
    active: true,
    created_by: 1,
    updated_by: null,
    created_at: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    updated_at: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    email: 'john@example.com',
  };

  return {
    __esModule: true,
    default: {
      getMemberById: async (id: number) => (id === 123 ? mockMember : null),
    },
  };
});

describe('GET /api/setting/membership-dues/:id', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
  });

  afterAll(async () => {
    await TestHelper.cleanupAll();
  });

  it('returns membership dues detail with member when found', async () => {
    // Seed a dues record
    const record = await prisma.membershipDues.create({
      data: {
        member_id: 123,
        period_year: 2024,
        period_month: 6,
        amount: 100000,
        paid_at: new Date('2024-06-15T00:00:00.000Z'),
        proof_file_path: null,
        note: 'Manual payment',
        created_by: 1,
      },
    });

    const response = await request(app)
      .get(`/api/finance/dues/${record.id}`)
      .set('Cookie', 'token=dummy-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Membership dues detail retrieved successfully');

    const data = response.body.data as {
      membership_dues: {
        id: number;
        member_id: number;
        amount: number;
        status: string;
        due_date: string;
        created_at: string;
        updated_at: string;
      };
      member: {
        id: number;
        name: string;
        username: string;
        gender: string;
        birthdate: string;
        address: string | null;
        phone: string | null;
        photo: string | null;
        active: boolean;
      };
    };

    expect(data.membership_dues.id).toBe(record.id);
    expect(data.membership_dues.member_id).toBe(123);
    expect(data.membership_dues.amount).toBe(100000);
    expect(data.membership_dues.status).toBe('paid');
    expect(new Date(data.membership_dues.due_date).toISOString()).toBe(new Date(2024, 5, 1).toISOString());
    expect(typeof data.membership_dues.created_at).toBe('string');
    expect(typeof data.membership_dues.updated_at).toBe('string');

    expect(data.member.id).toBe(123);
    expect(data.member.name).toBe('John Doe');
    expect(data.member.username).toBe('johndoe');
    expect(data.member.gender).toBe('Male');
    expect(data.member.active).toBe(true);
  });

  it('returns 404 when membership dues not found', async () => {
    const response = await request(app)
      .get('/api/finance/dues/9999')
      .set('Cookie', 'token=dummy-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('returns 400 when id param is invalid', async () => {
    const response = await request(app)
      .get('/api/finance/dues/abc')
      .set('Cookie', 'token=dummy-token');

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors[0]).toContain('ID must be a number');
  });
});
