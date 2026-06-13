import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const users = [
    { name: 'Alex Johnson', email: 'admin@ca-erp.com', role: 'ADMIN', department: 'IT', passwordHash: 'password' },
    { name: 'Sarah Chen', email: 'manager@ca-erp.com', role: 'MANAGER', department: 'Compliance', passwordHash: 'password' },
    { name: 'Mike Patel', email: 'analyst@ca-erp.com', role: 'ANALYST', department: 'Operations', passwordHash: 'password' },
    { name: 'Emma Davis', email: 'viewer@ca-erp.com', role: 'VIEWER', department: 'HR', passwordHash: 'password' },
    { name: 'James Wilson', email: 'ops@ca-erp.com', role: 'ANALYST', department: 'Operations', passwordHash: 'password' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u as any,
    });
  }

  // Create a few sample incidents and risks (minimal fields)
  const admin = await prisma.user.findUnique({ where: { email: 'admin@ca-erp.com' } });
  if (!admin) throw new Error('Admin user missing');

  await prisma.incident.upsert({
    where: { ticketNumber: 'INC-001' },
    update: {},
    create: {
      ticketNumber: 'INC-001',
      title: 'Unauthorized access attempt on VPN gateway',
      description: 'Multiple failed logins observed',
      category: 'SECURITY',
      severity: 'CRITICAL',
      status: 'OPEN',
      priority: 'URGENT',
      reportedById: admin.id,
    } as any,
  });

  await prisma.risk.upsert({
    where: { riskNumber: 'RISK-001' },
    update: {},
    create: {
      riskNumber: 'RISK-001',
      category: 'OPERATIONS_SECURITY',
      statement: 'All users have admin access on workstations',
      inherentRating: 'HIGH',
      residualRating: 'MEDIUM',
      acceptableLevel: 'LOW',
      identifiedDate: new Date(),
    } as any,
  });

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
