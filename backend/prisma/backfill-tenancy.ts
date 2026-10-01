/**
 * One-time, NON-DESTRUCTIVE backfill for existing databases.
 * Puts every pre-existing row that has no organisation into a single
 * "Default Organisation". Safe to re-run (only touches rows where organizationId IS NULL).
 *
 * Run AFTER `prisma db push` + `prisma generate`:
 *   npx tsx prisma/backfill-tenancy.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orphanUsers = await prisma.user.count({ where: { organizationId: null } });
  const orphanRows =
    orphanUsers +
    (await prisma.customer.count({ where: { organizationId: null } })) +
    (await prisma.lead.count({ where: { organizationId: null } })) +
    (await prisma.deal.count({ where: { organizationId: null } })) +
    (await prisma.task.count({ where: { organizationId: null } })) +
    (await prisma.meeting.count({ where: { organizationId: null } })) +
    (await prisma.activity.count({ where: { organizationId: null } }));

  if (orphanRows === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  let org = await prisma.organization.findFirst({ where: { name: 'Default Organisation' } });
  if (!org) org = await prisma.organization.create({ data: { name: 'Default Organisation' } });
  const organizationId = org.id;

  const data = { organizationId };
  const where = { organizationId: null };
  const results = {
    users: (await prisma.user.updateMany({ where, data })).count,
    customers: (await prisma.customer.updateMany({ where, data })).count,
    leads: (await prisma.lead.updateMany({ where, data })).count,
    deals: (await prisma.deal.updateMany({ where, data })).count,
    tasks: (await prisma.task.updateMany({ where, data })).count,
    meetings: (await prisma.meeting.updateMany({ where, data })).count,
    activities: (await prisma.activity.updateMany({ where, data })).count
  };
  console.log(`Backfilled into "${org.name}" (${organizationId}):`, results);

  const unassigned = await prisma.user.count({ where: { organizationId, role: 'SALES_EXECUTIVE', managerId: null } });
  if (unassigned > 0) {
    console.log(`NOTE: ${unassigned} Sales Executive(s) have no Manager yet. An Admin should assign them in Employees.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
