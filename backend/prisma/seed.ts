import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Fresh-start seed (Phase 1 of the production transformation).
 *
 * This intentionally creates NOTHING but the authentication/role system
 * and a single Admin account. There are no demo customers, leads, deals,
 * tasks, meetings, notifications or activities, and no extra Manager/
 * Sales/Viewer users — per the spec, "after login, the company starts
 * empty. The first Admin builds the company from scratch."
 *
 * Change ADMIN_EMAIL / ADMIN_PASSWORD below (or set them as env vars)
 * before running this against a real environment, then rotate the
 * password on first login.
 */
async function main() {
  console.log("🌱 Resetting to a clean, empty company...");

  // Clean existing tables in reverse dependency order
  await prisma.activity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create the first Admin account. This is the ONLY user in a fresh
  // company — everyone else (Managers, Sales Executives, Viewers) is
  // created by this Admin from the Employees page after logging in.
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@crm.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      name: "Admin",
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
      department: "Executive Leadership",
      status: "ACTIVE",
    },
  });

  console.log("✅ Company reset to a clean slate.");
  console.log(`   Admin login: ${adminEmail} / ${adminPassword}`);
  console.log("   ⚠️  Change this password immediately after first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
