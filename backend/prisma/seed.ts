import {
  PrismaClient,
  Role,
  WasteCategory,
  ReportStatus,
  Priority,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// All Panabo City Barangays with approximate coordinates
const barangays = [
  { name: "A.O. Floirendo", latitude: 7.308, longitude: 125.671 },
  { name: "Buenavista", latitude: 7.315, longitude: 125.695 },
  { name: "Cacao", latitude: 7.34, longitude: 125.71 },
  { name: "Cagangohan", latitude: 7.305, longitude: 125.683 },
  { name: "Consolacion", latitude: 7.295, longitude: 125.675 },
  { name: "Dapco", latitude: 7.32, longitude: 125.705 },
  { name: "Datu Abdul Dadia", latitude: 7.35, longitude: 125.72 },
  { name: "Gredu (Pob.)", latitude: 7.308, longitude: 125.684 },
  { name: "J.P. Laurel", latitude: 7.31, longitude: 125.687 },
  { name: "Kasilak", latitude: 7.325, longitude: 125.69 },
  { name: "Katipunan", latitude: 7.33, longitude: 125.68 },
  { name: "Katualan", latitude: 7.29, longitude: 125.67 },
  { name: "Kauswagan", latitude: 7.335, longitude: 125.675 },
  { name: "Kiotoy", latitude: 7.285, longitude: 125.665 },
  { name: "Little Panay", latitude: 7.315, longitude: 125.678 },
  { name: "Lower Panaga (Roxas)", latitude: 7.295, longitude: 125.69 },
  { name: "Mabunao", latitude: 7.34, longitude: 125.665 },
  { name: "Maduao", latitude: 7.28, longitude: 125.68 },
  { name: "Malativas", latitude: 7.3, longitude: 125.7 },
  { name: "Manay", latitude: 7.32, longitude: 125.66 },
  { name: "Nanyo", latitude: 7.31, longitude: 125.71 },
  { name: "New Malaga (Dalisay)", latitude: 7.345, longitude: 125.69 },
  { name: "New Pandan (Pob.)", latitude: 7.307, longitude: 125.685 },
  { name: "New Visayas", latitude: 7.335, longitude: 125.7 },
  { name: "Quezon", latitude: 7.31, longitude: 125.695 },
  { name: "Salvacion", latitude: 7.3, longitude: 125.66 },
  { name: "San Francisco (Pob.)", latitude: 7.309, longitude: 125.686 },
  { name: "San Nicolas", latitude: 7.315, longitude: 125.67 },
  { name: "San Pedro", latitude: 7.32, longitude: 125.685 },
  { name: "San Roque", latitude: 7.305, longitude: 125.678 },
  { name: "San Vicente", latitude: 7.295, longitude: 125.685 },
  { name: "Santo Niño (Pob.)", latitude: 7.3085, longitude: 125.6845 },
  { name: "Sindaton", latitude: 7.288, longitude: 125.69 },
  { name: "Southern Davao", latitude: 7.275, longitude: 125.675 },
  { name: "Tagpore", latitude: 7.3, longitude: 125.665 },
  { name: "Tibungol", latitude: 7.325, longitude: 125.67 },
  { name: "Upper Licanan", latitude: 7.33, longitude: 125.71 },
  { name: "Waterfall (New Katipunan)", latitude: 7.34, longitude: 125.68 },
  { name: "Buo", latitude: 7.318, longitude: 125.692 },
  { name: "New Managoy", latitude: 7.312, longitude: 125.705 },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Create barangays
  console.log("📍 Creating barangays...");
  const createdBarangays = [];
  for (const brgy of barangays) {
    const created = await prisma.barangay.upsert({
      where: { name: brgy.name },
      update: {},
      create: brgy,
    });
    createdBarangays.push(created);
  }
  console.log(`✅ Created ${createdBarangays.length} barangays`);

  // Create admin user
  console.log("👤 Creating admin user...");
  const hashedPassword = await bcrypt.hash("@Admin123*", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@bluewaste.ph" },
    update: {
      password: hashedPassword,
    },
    create: {
      email: "admin@bluewaste.ph",
      password: hashedPassword,
      firstName: "System",
      lastName: "Admin",
      role: Role.LGU_ADMIN,
      phone: "+639123456789",
      barangayId: createdBarangays[7].id, // Gredu (Pob.)
    },
  });
  console.log(`✅ Admin user created: ${adminUser.email}`);

  // Create field worker
  console.log("👷 Creating field worker...");
  const fieldWorkerPassword = await bcrypt.hash("worker123", 12);
  const fieldWorker = await prisma.user.upsert({
    where: { email: "worker@bluewaste.ph" },
    update: {},
    create: {
      email: "worker@bluewaste.ph",
      password: fieldWorkerPassword,
      firstName: "Juan",
      lastName: "Dela Cruz",
      role: Role.FIELD_WORKER,
      phone: "+639987654321",
      barangayId: createdBarangays[7].id,
    },
  });
  console.log(`✅ Field worker created: ${fieldWorker.email}`);

  // Create resort admin user
  console.log("🏝️ Creating resort admin...");
  const resortAdminPassword = await bcrypt.hash("resort123", 12);
  const resortAdmin = await prisma.user.upsert({
    where: { email: "resort@bluewaste.ph" },
    update: {},
    create: {
      email: "resort@bluewaste.ph",
      password: resortAdminPassword,
      firstName: "Resort",
      lastName: "Admin",
      role: Role.RESORT_ADMIN,
      phone: "+639222333444",
      barangayId: createdBarangays[7].id,
    },
  });
  console.log(`✅ Resort admin created: ${resortAdmin.email}`);

  // Create citizen user
  console.log("👤 Creating citizen user...");
  const citizenPassword = await bcrypt.hash("citizen123", 12);
  const citizen = await prisma.user.upsert({
    where: { email: "citizen@bluewaste.ph" },
    update: {},
    create: {
      email: "citizen@bluewaste.ph",
      password: citizenPassword,
      firstName: "Maria",
      lastName: "Santos",
      role: Role.CITIZEN,
      phone: "+639111222333",
      barangayId: createdBarangays[0].id,
    },
  });
  console.log(`✅ Citizen user created: ${citizen.email}`);

  // Create sample reports
  console.log("📋 Creating sample reports...");
  const sampleReports = [
    {
      title: "Illegal Dumping Near River",
      description:
        "Large pile of solid waste found near the river banks. Needs immediate cleanup.",
      category: WasteCategory.SOLID_WASTE,
      status: ReportStatus.PENDING,
      priority: Priority.HIGH,
      latitude: 7.308,
      longitude: 125.684,
      address: "Riverside Area, Gredu, Panabo City",
      reporterId: citizen.id,
      barangayId: createdBarangays[7].id,
      isAnonymous: false,
    },
    {
      title: "Hazardous Chemical Containers",
      description:
        "Abandoned chemical containers found in vacant lot. Potential environmental hazard.",
      category: WasteCategory.HAZARDOUS,
      status: ReportStatus.VERIFIED,
      priority: Priority.CRITICAL,
      latitude: 7.315,
      longitude: 125.695,
      address: "Vacant Lot, Buenavista, Panabo City",
      reporterId: citizen.id,
      barangayId: createdBarangays[1].id,
      isAnonymous: false,
    },
    {
      title: "Overflowing Garbage Bin",
      description:
        "Public garbage bin has not been collected for days. Overflowing onto the street.",
      category: WasteCategory.SOLID_WASTE,
      status: ReportStatus.CLEANUP_SCHEDULED,
      priority: Priority.MEDIUM,
      latitude: 7.309,
      longitude: 125.686,
      address: "Main Street, San Francisco, Panabo City",
      reporterId: citizen.id,
      assignedToId: fieldWorker.id,
      barangayId: createdBarangays[26].id,
      isAnonymous: false,
    },
    {
      title: "Electronic Waste Dumped",
      description: "Old computers and electronic parts dumped near the school.",
      category: WasteCategory.ELECTRONIC,
      status: ReportStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      latitude: 7.32,
      longitude: 125.685,
      address: "Near Elementary School, San Pedro, Panabo City",
      reporterId: citizen.id,
      assignedToId: fieldWorker.id,
      barangayId: createdBarangays[28].id,
      isAnonymous: false,
    },
    {
      title: "Organic Waste Pile",
      description:
        "Large pile of organic waste from market activities. Causing bad odor.",
      category: WasteCategory.ORGANIC,
      status: ReportStatus.CLEANED,
      priority: Priority.LOW,
      latitude: 7.31,
      longitude: 125.687,
      address: "Public Market Area, J.P. Laurel, Panabo City",
      reporterId: citizen.id,
      barangayId: createdBarangays[8].id,
      isAnonymous: false,
    },
    {
      title: "Recyclable Materials Scattered",
      description: "Plastic bottles and cardboard scattered along the highway.",
      category: WasteCategory.RECYCLABLE,
      status: ReportStatus.PENDING,
      priority: Priority.LOW,
      latitude: 7.305,
      longitude: 125.683,
      address: "National Highway, Cagangohan, Panabo City",
      isAnonymous: true,
      barangayId: createdBarangays[3].id,
    },
    {
      title: "Liquid Waste Spill",
      description: "Industrial liquid waste spotted flowing into drainage.",
      category: WasteCategory.LIQUID,
      status: ReportStatus.VERIFIED,
      priority: Priority.CRITICAL,
      latitude: 7.33,
      longitude: 125.68,
      address: "Industrial Area, Katipunan, Panabo City",
      reporterId: citizen.id,
      barangayId: createdBarangays[10].id,
      isAnonymous: false,
    },
    {
      title: "Construction Debris on Road",
      description:
        "Construction waste blocking part of the road. Hazard to motorists.",
      category: WasteCategory.SOLID_WASTE,
      status: ReportStatus.PENDING,
      priority: Priority.HIGH,
      latitude: 7.325,
      longitude: 125.69,
      address: "Kasilak Road, Panabo City",
      reporterId: citizen.id,
      barangayId: createdBarangays[9].id,
      isAnonymous: false,
    },
  ];

  for (const report of sampleReports) {
    await prisma.report.create({ data: report });
  }
  console.log(`✅ Created ${sampleReports.length} sample reports`);

  await prisma.resortArea.upsert({
    where: { name: "Resort Mr Suave" },
    update: {},
    create: {
      name: "Resort Mr Suave",
      description: "Sample managed area for resort admin account",
      minLat: 7.302,
      maxLat: 7.314,
      minLng: 125.682,
      maxLng: 125.695,
      ownerId: resortAdmin.id,
      createdById: adminUser.id,
    },
  });
  console.log("✅ Sample resort box created: Resort Mr Suave");

  console.log("🎉 Database seeding completed!");
  console.log("\n📌 Default Accounts:");
  console.log("   Admin:   admin@bluewaste.ph / @Admin123*");
  console.log("   Resort:  resort@bluewaste.ph / resort123");
  console.log("   Worker:  worker@bluewaste.ph / worker123");
  console.log("   Citizen: citizen@bluewaste.ph / citizen123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
