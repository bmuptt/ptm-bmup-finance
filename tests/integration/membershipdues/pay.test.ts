import request from 'supertest';
import app from '../../../src/main';
import prisma from '../../../src/config/database';
import { TestHelper } from '../../test-util';
import path from 'path';
import fs from 'fs';

// Mock auth middleware
jest.mock('../../../src/middleware/auth.middleware', () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    req.user = { id: 999, name: 'Tester', email: 'tester@example.com', role: { id: 1, name: 'Admin' }, role_id: 1 };
    next();
  };
  return { __esModule: true, default: mockMiddleware };
});

// Mock setting member repository
jest.mock('../../../src/repository/setting-member.repository', () => {
  return {
    __esModule: true,
    default: {
      // We don't need these for pay test, but service might import it
    },
  };
});

describe('POST /api/finance/dues', () => {
  beforeEach(async () => {
    await TestHelper.refreshDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create payment and update history balance (paid)', async () => {
    const payload = {
      member_id: 1,
      period_year: 2025,
      period_month: 1,
      status: 'paid'
    };

    const res = await request(app)
      .post('/api/finance/dues')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Membership dues marked as paid');

    // Verify DB
    const due = await prisma.membershipDues.findFirst({
      where: {
        member_id: 1,
        period_year: 2025,
        period_month: 1
      }
    });
    expect(due).not.toBeNull();
    expect(Number(due?.amount)).toBe(10000); // Should use constant amount
    expect(due?.note).toContain('Membership Dues Payment');

    const history = await prisma.historyBalance.findFirst({
        orderBy: { id: 'desc' }
    });
    expect(history).not.toBeNull();
    expect(history?.status).toBe(true);
    expect(Number(history?.value)).toBe(10000);
    
    const cashBalance = await prisma.cashBalance.findFirst();
    expect(Number(cashBalance?.balance)).toBe(10000);
  });

  it('should delete payment and update history balance (unpaid)', async () => {
    // Setup: create existing payment
    await prisma.cashBalance.create({ data: { balance: 10000 } });
    await prisma.membershipDues.create({
        data: {
            member_id: 1,
            period_year: 2025,
            period_month: 1,
            amount: 10000,
            paid_at: new Date(),
            created_by: 999
        }
    });

    const payload = {
      member_id: 1,
      period_year: 2025,
      period_month: 1,
      status: 'unpaid'
    };

    const res = await request(app)
      .post('/api/finance/dues')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Membership dues marked as unpaid');

    // Verify DB
    const due = await prisma.membershipDues.findFirst({
      where: {
        member_id: 1,
        period_year: 2025,
        period_month: 1
      }
    });
    expect(due).toBeNull();

    const history = await prisma.historyBalance.findFirst({
        orderBy: { id: 'desc' }
    });
    expect(history).not.toBeNull();
    expect(history?.status).toBe(false);
    expect(Number(history?.value)).toBe(10000);
    
    const cashBalance = await prisma.cashBalance.findFirst();
    expect(Number(cashBalance?.balance)).toBe(0);
  });

  it('should fail if already paid', async () => {
    // Setup: create existing payment
    await prisma.membershipDues.create({
        data: {
            member_id: 1,
            period_year: 2025,
            period_month: 1,
            amount: 10000,
            paid_at: new Date(),
            created_by: 999
        }
    });

    const payload = {
      member_id: 1,
      period_year: 2025,
      period_month: 1,
      status: 'paid'
    };

    const res = await request(app)
      .post('/api/finance/dues')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0]).toContain('already paid');
  });

  it('should fail if unpaid but record not found', async () => {
    const payload = {
      member_id: 1,
      period_year: 2025,
      period_month: 1,
      status: 'unpaid'
    };

    const res = await request(app)
      .post('/api/finance/dues')
      .send(payload);

    expect(res.status).toBe(404);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0]).toContain('not found');
  });

  it('should validate input', async () => {
     const res = await request(app)
      .post('/api/finance/dues')
      .send({}); // Empty payload
      
     expect(res.status).toBe(400);
     expect(res.body.errors).toBeDefined();
  });

  it('should update proof file for existing dues by id', async () => {
    // Seed existing paid record
    const existing = await prisma.membershipDues.create({
      data: {
        member_id: 4,
        period_year: 2025,
        period_month: 4,
        amount: 10000,
        paid_at: new Date(),
        created_by: 999,
      },
    });

    const filePath = path.join(__dirname, 'test-proof-separate.jpg');
    fs.writeFileSync(filePath, 'fake image content');

    const uploadRes = await request(app)
      .put(`/api/finance/dues/${existing.id}/proof`)
      .set('Authorization', 'Bearer token')
      .field('status_file', 1)
      .attach('proof_file', filePath);

    // Clean up temp file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.message).toBe('Proof file updated');
    const uploadedPath = uploadRes.body.data.path;
    expect(uploadedPath).toBeDefined();

    // Verify DB
    const due = await prisma.membershipDues.findUnique({
      where: { id: existing.id },
    });
    expect(due).not.toBeNull();
    expect(due?.proof_file_path).toBe(uploadedPath);

    // Cleanup uploaded file
    if (uploadedPath && fs.existsSync(path.resolve(uploadedPath))) {
      fs.unlinkSync(path.resolve(uploadedPath));
    }
  });

  it('should delete proof file when status is changed to unpaid (path from DB)', async () => {
    // 1. Create a dummy file pretending it was uploaded
    const uploadsDir = path.join(process.cwd(), 'storage/proof_file');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const dummyFileName = `proof-db-${Date.now()}.jpg`;
    const dummyFilePath = path.join(uploadsDir, dummyFileName);
    fs.writeFileSync(dummyFilePath, 'fake image content');

    // 2. Create existing paid record with this file
    await prisma.membershipDues.create({
        data: {
            member_id: 5,
            period_year: 2025,
            period_month: 5,
            amount: 10000,
            paid_at: new Date(),
            proof_file_path: dummyFilePath,
            created_by: 999
        }
    });

    // 3. Send unpaid request (no file needed in request)
    const payload = {
      member_id: 5,
      period_year: 2025,
      period_month: 5,
      status: 'unpaid'
    };

    const res = await request(app)
      .post('/api/finance/dues')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Membership dues marked as unpaid');

    // 4. Verify DB record is gone
    const due = await prisma.membershipDues.findFirst({
        where: {
            member_id: 5,
            period_year: 2025,
            period_month: 5
        }
    });
    expect(due).toBeNull();

    // 5. Verify file is deleted
    expect(fs.existsSync(dummyFilePath)).toBe(false);
  });
});



