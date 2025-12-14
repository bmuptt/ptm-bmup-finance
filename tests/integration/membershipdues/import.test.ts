import request from 'supertest';
import app from '../../../src/main';
import prisma from '../../../src/config/database';
import { TestHelper } from '../../test-util';
import path from 'path';
import fs from 'fs';
import { FINANCE_CONSTANTS } from '../../../src/constants/finance.constant';

jest.mock('../../../src/middleware/auth.middleware', () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: 999, name: 'Tester', email: 'tester@example.com', role: { id: 1, name: 'Admin' }, role_id: 1 };
    next();
  };
  return { __esModule: true, default: mockMiddleware };
});

const mockGetMembersByIds = jest.fn();

jest.mock('../../../src/repository/setting-member.repository', () => {
  return {
    __esModule: true,
    default: {
      getMembersByIds: (...args: any[]) => mockGetMembersByIds(...args),
    },
  };
});

const createExcelFile = (rows: Array<Record<string, any>>): string => {
  // Lazy require xlsx to avoid issues if not installed in some environments
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx');
  const header = ['Member ID', 'Member Name', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data = [header, ...rows.map(r => [
    r['Member ID'], r['Member Name'],
    r['Jan'], r['Feb'], r['Mar'], r['Apr'], r['May'], r['Jun'], r['Jul'], r['Aug'], r['Sep'], r['Oct'], r['Nov'], r['Dec'],
  ])];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const filePath = path.join(process.cwd(), `storage/private/imports/test-import-${Date.now()}.xlsx`);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  XLSX.writeFile(wb, filePath);
  return filePath;
};

describe('POST /api/finance/dues/import', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await TestHelper.cleanupAll();
  });

  it('should import dues from Excel, create payments and update balances', async () => {
    mockGetMembersByIds.mockResolvedValue([
      { id: 1, name: 'Member 1', active: true },
      { id: 2, name: 'Member 2', active: true },
    ]);

    const filePath = createExcelFile([
      { 'Member ID': 1, 'Member Name': 'Member 1', Jan: 'paid', Feb: 'paid', Mar: 'unpaid', Apr: 'unpaid', May: 'unpaid', Jun: 'unpaid', Jul: 'unpaid', Aug: 'unpaid', Sep: 'unpaid', Oct: 'unpaid', Nov: 'unpaid', Dec: 'unpaid' },
      { 'Member ID': 2, 'Member Name': 'Member 2', Jan: 'unpaid', Feb: 'unpaid', Mar: 'unpaid', Apr: 'unpaid', May: 'unpaid', Jun: 'unpaid', Jul: 'unpaid', Aug: 'unpaid', Sep: 'unpaid', Oct: 'unpaid', Nov: 'unpaid', Dec: 'unpaid' },
      { 'Member ID': 9999, 'Member Name': 'Invalid', Jan: 'paid', Feb: 'unpaid', Mar: 'unpaid', Apr: 'unpaid', May: 'unpaid', Jun: 'unpaid', Jul: 'unpaid', Aug: 'unpaid', Sep: 'unpaid', Oct: 'unpaid', Nov: 'unpaid', Dec: 'unpaid' },
    ]);

    const res = await request(app)
      .post('/api/finance/dues/import')
      .field('period_year', 2025)
      .attach('file', filePath);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.total_rows).toBe(3);
    expect(res.body.data.summary.success_rows).toBe(2);
    expect(res.body.data.summary.failed_rows).toBe(1);

    const duesMember1 = await prisma.membershipDues.findMany({
      where: { member_id: 1, period_year: 2025 },
      orderBy: { period_month: 'asc' },
    });
    expect(duesMember1.length).toBe(2);
    expect(duesMember1[0].period_month).toBe(1);
    expect(duesMember1[1].period_month).toBe(2);
    expect(Number(duesMember1[0].amount)).toBe(FINANCE_CONSTANTS.DEFAULT_IURAN_AMOUNT);

    const cashBalance = await prisma.cashBalance.findFirst();
    expect(Number(cashBalance?.balance)).toBe(FINANCE_CONSTANTS.DEFAULT_IURAN_AMOUNT * 2);

    const historyCount = await prisma.historyBalance.count();
    expect(historyCount).toBe(2);
  });

  it('should reverse existing payments when Excel marks unpaid', async () => {
    mockGetMembersByIds.mockResolvedValue([
      { id: 3, name: 'Member 3', active: true },
    ]);

    await prisma.cashBalance.create({ data: { balance: FINANCE_CONSTANTS.DEFAULT_IURAN_AMOUNT } });
    await prisma.historyBalance.create({
      data: { status: true, value: FINANCE_CONSTANTS.DEFAULT_IURAN_AMOUNT, description: 'Seed', created_by: 999 },
    });
    await prisma.membershipDues.create({
      data: {
        member_id: 3,
        period_year: 2025,
        period_month: 3,
        amount: FINANCE_CONSTANTS.DEFAULT_IURAN_AMOUNT,
        paid_at: new Date(),
        created_by: 999,
      },
    });

    const filePath = createExcelFile([
      { 'Member ID': 3, 'Member Name': 'Member 3', Jan: 'unpaid', Feb: 'unpaid', Mar: 'unpaid', Apr: 'unpaid', May: 'unpaid', Jun: 'unpaid', Jul: 'unpaid', Aug: 'unpaid', Sep: 'unpaid', Oct: 'unpaid', Nov: 'unpaid', Dec: 'unpaid' },
    ]);

    const res = await request(app)
      .post('/api/finance/dues/import')
      .field('period_year', 2025)
      .attach('file', filePath);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const due = await prisma.membershipDues.findFirst({
      where: { member_id: 3, period_year: 2025, period_month: 3 },
    });
    expect(due).toBeNull();

    const cashBalance = await prisma.cashBalance.findFirst();
    expect(Number(cashBalance?.balance)).toBe(0);

    const lastHistory = await prisma.historyBalance.findFirst({ orderBy: { id: 'desc' } });
    expect(lastHistory?.status).toBe(false);
    expect(Number(lastHistory?.value)).toBe(FINANCE_CONSTANTS.DEFAULT_IURAN_AMOUNT);
  });
});

