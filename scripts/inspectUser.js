const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  try {
    const u = await prisma.user.findUnique({
      where: { email: "resort@bluewaste.ph" },
    });
    console.log(JSON.stringify(u, null, 2));
  } catch (e) {
    console.error("ERROR", e.message || e);
  } finally {
    await prisma.$disconnect();
  }
})();
