import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Development seed.
 *
 * This creates a single demo organisation and three valid team accounts
 * (ADMIN, MANAGER, SALES_EXECUTIVE) so the SaaS workflows can be exercised
 * immediately after `npm run prisma:seed`.
 */
async function main() {
  console.log("🌱 Creating a demo CRM organisation...");

  await prisma.activity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const organization = await prisma.organization.create({
    data: { name: "Northstar Labs" },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@crm.com";
  const managerEmail = process.env.SEED_MANAGER_EMAIL || "manager@crm.com";
  const salesEmail = process.env.SEED_SALES_EMAIL || "sales@crm.com";

  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: adminEmail,
      passwordHash: await bcrypt.hash(
        process.env.SEED_ADMIN_PASSWORD || "Admin@123",
        10,
      ),
      role: Role.ADMIN,
      department: "Executive Leadership",
      status: "ACTIVE",
      organizationId: organization.id,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      name: "Manager User",
      email: managerEmail,
      passwordHash: await bcrypt.hash(
        process.env.SEED_MANAGER_PASSWORD || "Manager@123",
        10,
      ),
      role: Role.MANAGER,
      department: "Sales",
      status: "ACTIVE",
      organizationId: organization.id,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: "Sales Executive",
      email: salesEmail,
      passwordHash: await bcrypt.hash(
        process.env.SEED_SALES_PASSWORD || "Sales@123",
        10,
      ),
      role: Role.SALES_EXECUTIVE,
      department: "Sales",
      status: "ACTIVE",
      organizationId: organization.id,
      managerId: managerUser.id,
    },
  });

  console.log("✅ Demo organisation created with active users:");
  console.log(`   ${Role.ADMIN.padEnd(16)} ${adminUser.email} / Admin@123`);
  console.log(
    `   ${Role.MANAGER.padEnd(16)} ${managerUser.email} / Manager@123`,
  );
  console.log(
    `   ${Role.SALES_EXECUTIVE.padEnd(16)} ${salesUser.email} / Sales@123`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
