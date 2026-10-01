const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function test() {
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({
    where: {
      email: "sabareeswarans101@gmail.com"
    }
  });

  if (!user) {
    console.log("USER_NOT_FOUND");
    await prisma.$disconnect();
    return;
  }

  console.log("USER_FOUND:", user.name);
  console.log("ROLE:", user.role);
  console.log("STATUS:", user.status);

  const passwordMatch = await bcrypt.compare(
    process.env.TEST_PASSWORD,
    user.passwordHash
  );

  console.log("PASSWORD_MATCH:", passwordMatch);

  await prisma.$disconnect();
}

test().catch((error) => {
  console.error(error);
  process.exit(1);
});
