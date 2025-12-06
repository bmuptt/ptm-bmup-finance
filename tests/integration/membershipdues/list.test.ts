import request from 'supertest';
import app from '../../../src/main';
import prisma from '../../../src/config/database';
import { TestHelper } from '../../test-util';

// Mock auth middleware
jest.mock('../../../src/middleware/auth.middleware', () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: 999, name: 'Tester', email: 'tester@example.com', role: { id: 1, name: 'Admin' }, role_id: 1 };
    next();
  };
  return { __esModule: true, default: mockMiddleware };
});

// Mock setting member repository
const mockGetMembersList = jest.fn();
const mockGetActiveMembers = jest.fn();
const mockGetMembersByIds = jest.fn();
const mockGetMembersLoadMore = jest.fn();

jest.mock('../../../src/repository/setting-member.repository', () => {
  return {
    __esModule: true,
    default: {
      getMembersList: (...args: any[]) => mockGetMembersList(...args),
      getActiveMembers: (...args: any[]) => mockGetActiveMembers(...args),
      getMembersByIds: (...args: any[]) => mockGetMembersByIds(...args),
      getMembersLoadMore: (...args: any[]) => mockGetMembersLoadMore(...args),
    },
  };
});

describe('Membership Dues - List', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await TestHelper.cleanupAll();
  });

  it('should list membership dues with pagination driven by members', async () => {
    // Mock external members
    const mockMembers = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Member ${i + 1}`,
      active: true,
    }));

    // Mock getMembersLoadMore as it's preferred for page 1
    mockGetMembersLoadMore.mockResolvedValue({
      data: mockMembers,
      meta: {
        nextCursor: null,
        hasMore: false,
        limit: 10,
        totalItems: 5,
        totalPages: 1,
        currentPage: 1
      }
    });

    // Seed dues for member 1 and 2
    await prisma.membershipDues.createMany({
      data: [
        { member_id: 1, period_year: 2025, period_month: 1, amount: 10000, paid_at: new Date(), created_by: 999 },
        // Month 2 is unpaid, so we don't create a record for it
        { member_id: 2, period_year: 2025, period_month: 1, amount: 10000, paid_at: new Date(), created_by: 999 },
      ],
    });

    const res = await request(app)
      .get('/api/finance/dues?page=1&limit=10&period_year=2025')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(5); // 5 members
    
    // Check member 1
    const item1 = res.body.items.find((i: any) => i.member.id === 1);
    expect(item1).toBeDefined();
    expect(item1.member.name).toBe('Member 1');
    expect(item1.months).toHaveLength(12);
    
    // Check month 1 for member 1 (paid)
    const m1_1 = item1.months.find((m: { month: number; status: string; amount: number; id: number | null }) => m.month === 1);
    expect(m1_1.status).toBe('paid');
    expect(m1_1.amount).toBe(10000);

    // Check month 2 for member 1 (unpaid)
    const m1_2 = item1.months.find((m: { month: number; status: string; amount: number; id: number | null }) => m.month === 2);
    expect(m1_2.status).toBe('unpaid');
    expect(m1_2.amount).toBe(0);

    // Check month 3 for member 1 (no record -> unpaid)
    const m1_3 = item1.months.find((m: any) => m.month === 3);
    expect(m1_3.status).toBe('unpaid');
    expect(m1_3.amount).toBe(0); // default if no record
    
    // Check member 3 (no dues seeded)
    const item3 = res.body.items.find((i: any) => i.member.id === 3);
    expect(item3).toBeDefined();
    expect(item3.months).toHaveLength(12);
    expect(item3.months[0].status).toBe('unpaid');
  });

  it('should handle empty member list', async () => {
    mockGetMembersLoadMore.mockResolvedValue({
      data: [],
      meta: {
        nextCursor: null,
        hasMore: false,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        currentPage: 1
      },
    });

    const res = await request(app)
      .get('/api/finance/dues?page=1&limit=10&period_year=2025')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.meta.totalItems).toBe(0);
  });

  it('should list membership dues using cursor pagination', async () => {
    // Mock external members
    const mockMembers = Array.from({ length: 3 }, (_, i) => ({
      id: 10 - i, // 10, 9, 8 (Desc)
      name: `Member ${10 - i}`,
      active: true,
    }));

    mockGetMembersLoadMore.mockResolvedValue({
      success: true,
      data: mockMembers,
      meta: {
        nextCursor: 7,
        hasMore: true,
        limit: 3
      },
      message: 'Success'
    });

    // Seed dues for member 10
    await prisma.membershipDues.createMany({
      data: [
        { member_id: 10, period_year: 2025, period_month: 1, amount: 15000, paid_at: new Date(), created_by: 999 },
      ],
    });

    const res = await request(app)
      .get('/api/finance/dues?limit=3&period_year=2025&cursor=13')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(3);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.nextCursor).toBe(7);
    
    // Check member 10
    const item10 = res.body.items.find((i: any) => i.member.id === 10);
    expect(item10).toBeDefined();
    expect(item10.months[0].status).toBe('paid');
    expect(item10.months[0].amount).toBe(15000);
    
    // Verify mock call
    expect(mockGetMembersLoadMore).toHaveBeenCalledWith(expect.objectContaining({
      limit: 3,
      cursor: 13
    }));
    
    // Check member 10
  });
});