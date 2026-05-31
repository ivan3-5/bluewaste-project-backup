import {
  PrismaClient,
  Role,
  WasteCategory,
  ReportStatus,
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

  // Clean old reports first to allow clean re-seed
  console.log("🧹 Cleaning old reports...");
  await prisma.report.deleteMany({});

  // Create sample reports using the new schema
  console.log("📋 Creating sample reports...");
  const sampleReports = [
    {
      title: "Scattered Plastic Bottles",
      description: "Large pile of plastic containers and bottles dumped near the highway.",
      category: WasteCategory.PLASTIC_WASTE,
      status: ReportStatus.PENDING,
      latitude: 7.308,
      longitude: 125.684,
      address: "Riverside Area, Gredu, Panabo City",
      reporterId: citizen.id,
      isAnonymous: false,
    },
    {
      title: "Discarded Cardboard and Papers",
      description: "Bunch of wet cardboard boxes blocking the public sidewalk.",
      category: WasteCategory.PAPER_WASTE,
      status: ReportStatus.VERIFIED,
      latitude: 7.315,
      longitude: 125.695,
      address: "Commercial Center, Buenavista, Panabo City",
      reporterId: citizen.id,
      isAnonymous: false,
    },
    {
      title: "Broken Glass and Bottles",
      description: "Hazardous broken glass bottles scattered across the basketball court.",
      category: WasteCategory.GLASS_WASTE,
      status: ReportStatus.CLEANUP_SCHEDULED,
      latitude: 7.309,
      longitude: 125.686,
      address: "Barangay Plaza, San Francisco, Panabo City",
      reporterId: citizen.id,
      assignedToId: fieldWorker.id,
      isAnonymous: false,
    },
    {
      title: "Scrap Metal and Cans",
      description: "Rusty metal sheets and soft drink cans dumped by the road side.",
      category: WasteCategory.METAL_WASTE,
      status: ReportStatus.IN_PROGRESS,
      latitude: 7.32,
      longitude: 125.685,
      address: "Near Elementary School, San Pedro, Panabo City",
      reporterId: citizen.id,
      assignedToId: fieldWorker.id,
      isAnonymous: false,
    },
    {
      title: "Rotting Organic Food Waste",
      description: "Uncollected food scraps and organic waste causing a terrible smell near the market.",
      category: WasteCategory.ORGANIC_WASTE,
      status: ReportStatus.CLEANED,
      latitude: 7.31,
      longitude: 125.687,
      address: "Public Market Area, J.P. Laurel, Panabo City",
      reporterId: citizen.id,
      isAnonymous: false,
    },
    {
      title: "Plastic Cups and Wrappers",
      description: "Various single-use plastic cups and wrappers littering the public park.",
      category: WasteCategory.PLASTIC_WASTE,
      status: ReportStatus.PENDING,
      latitude: 7.305,
      longitude: 125.683,
      address: "Freedom Park, Cagangohan, Panabo City",
      isAnonymous: true,
    },
  ];

  for (const report of sampleReports) {
    await prisma.report.create({ data: report });
  }
  console.log(`✅ Created ${sampleReports.length} sample reports`);

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
