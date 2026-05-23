const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  try {
    const updated = await prisma.user.update({
      where: { email: "resort@bluewaste.ph" },
      data: { isActive: true },
    });
    console.log("Updated:", JSON.stringify(updated, null, 2));
  } catch (e) {
    console.error("ERROR", e.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
