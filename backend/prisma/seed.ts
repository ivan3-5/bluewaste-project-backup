import {
  PrismaClient,
  Role,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  console.log("👤 Creating admin user...");
  const adminPassword = await bcrypt.hash("@Admin123*", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@bluewaste.ph" },
    update: {
      password: adminPassword,
    },
    create: {
      email: "admin@bluewaste.ph",
      password: adminPassword,
      firstName: "System",
      lastName: "Admin",
      role: Role.LGU_ADMIN,
      phone: "+639123456789",
    },
  });
  console.log(`✅ Admin user created: ${adminUser.email}`);

  // Create field worker
  console.log("👷 Creating field worker...");
  const fieldWorkerPassword = await bcrypt.hash("worker123", 12);
  const fieldWorker = await prisma.user.upsert({
    where: { email: "worker@bluewaste.ph" },
    update: {
      password: fieldWorkerPassword,
    },
    create: {
      email: "worker@bluewaste.ph",
      password: fieldWorkerPassword,
      firstName: "Juan",
      lastName: "Dela Cruz",
      role: Role.FIELD_WORKER,
      phone: "+639987654321",
    },
  });
  console.log(`✅ Field worker created: ${fieldWorker.email}`);

  // Create citizen user
  console.log("👤 Creating citizen user...");
  const citizenPassword = await bcrypt.hash("citizen123", 12);
  const citizen = await prisma.user.upsert({
    where: { email: "citizen@bluewaste.ph" },
    update: {
      password: citizenPassword,
    },
    create: {
      email: "citizen@bluewaste.ph",
      password: citizenPassword,
      firstName: "Maria",
      lastName: "Santos",
      role: Role.CITIZEN,
      phone: "+639111222333",
    },
  });
  console.log(`✅ Citizen user created: ${citizen.email}`);

  console.log("🎉 Database seeding completed!");
  console.log("\n📌 Default Accounts:");
  console.log("   Admin:   admin@bluewaste.ph / @Admin123*");
  console.log("   Worker:  worker@bluewaste.ph / worker123");
  console.log("   Citizen: citizen@bluewaste.ph / citizen123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
