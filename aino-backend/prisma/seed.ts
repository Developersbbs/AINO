import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Approved admin — can log in immediately
  await prisma.user.upsert({
    where: { phone: '+919000000001' },
    update: {},
    create: {
      name: 'Super Admin',
      phone: '+919000000001',
      email: 'admin@aino.dev',
      role: UserRole.Admin,
      is_approved: true,
    },
  });

  // Unapproved agent — OTP verify returns 403
  await prisma.user.upsert({
    where: { phone: '+919000000002' },
    update: {},
    create: {
      name: 'Pending Agent',
      phone: '+919000000002',
      email: 'agent@aino.dev',
      role: UserRole.Agent,
      is_approved: false,
    },
  });

  console.log('Seed complete: 1 Admin (approved), 1 Agent (unapproved)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
