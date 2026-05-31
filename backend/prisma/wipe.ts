import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting database and Cloudinary wipe...");

  try {
    // 1. Fetch all Cloudinary public IDs from the database before deleting (as fallback)
    console.log("📸 Fetching Cloudinary image public IDs from database...");
    const images = await prisma.reportImage.findMany({
      select: { publicId: true },
    });
    const publicIds = images
      .map((img) => img.publicId)
      .filter((id): id is string => Boolean(id && id.trim().length > 0));

    // 2. Delete all resources with prefix 'bluewaste/' directly from Cloudinary
    console.log("☁️  Wiping everything in the 'bluewaste/' folder on Cloudinary...");
    const resourceTypes = ["image", "video", "raw"];
    for (const resType of resourceTypes) {
      try {
        const result = await cloudinary.api.delete_resources_by_prefix("bluewaste/", {
          resource_type: resType,
          type: "upload",
        });
        console.log(`   - Deleted ${resType} resources starting with 'bluewaste/':`, result);
      } catch (err: any) {
        console.log(`   - Info/Skipped ${resType} resource prefix deletion: ${err.message || err}`);
      }
    }

    // 3. Delete any other database-linked image public IDs that might not be under 'bluewaste/' prefix
    const uniqueIdsNotInFolder = publicIds.filter((id) => !id.startsWith("bluewaste/"));
    if (uniqueIdsNotInFolder.length > 0) {
      console.log(`☁️  Deleting ${uniqueIdsNotInFolder.length} other database-linked images from Cloudinary...`);
      const deletePromises = uniqueIdsNotInFolder.map((id) =>
        cloudinary.uploader.destroy(id).catch((err) => {
          console.error(`⚠️  Failed to delete Cloudinary image: ${id}`, err);
        })
      );
      await Promise.all(deletePromises);
    }

    // 4. Try deleting empty folders
    try {
      console.log("📂 Removing empty Cloudinary folders...");
      await cloudinary.api.delete_folder("bluewaste/reports");
      console.log("   - Folder 'bluewaste/reports' deleted successfully");
    } catch (err: any) {
      console.log(`   - Info/Skipped deleting folder 'bluewaste/reports': ${err.message || err}`);
    }

    try {
      await cloudinary.api.delete_folder("bluewaste");
      console.log("   - Folder 'bluewaste' deleted successfully");
    } catch (err: any) {
      console.log(`   - Info/Skipped deleting folder 'bluewaste': ${err.message || err}`);
    }

    console.log("✅ Cloudinary images and folders wiped successfully");

    // 3. Clear database tables in a foreign-key-safe order
    console.log("🗄️  Wiping database tables...");

    console.log("   - Wiping StatusHistory...");
    await prisma.statusHistory.deleteMany({});

    console.log("   - Wiping ReportImage...");
    await prisma.reportImage.deleteMany({});

    console.log("   - Wiping Notification...");
    await prisma.notification.deleteMany({});

    console.log("   - Wiping ActivityLog...");
    await prisma.activityLog.deleteMany({});

    console.log("   - Wiping WasteReport...");
    await prisma.wasteReport.deleteMany({});

    console.log("   - Wiping ReportingZone...");
    await prisma.reportingZone.deleteMany({});

    console.log("   - Wiping Report...");
    await prisma.report.deleteMany({});

    console.log("   - Wiping User...");
    await prisma.user.deleteMany({});

    console.log("✅ Database tables wiped successfully");
    console.log("🎉 Complete database and Cloudinary wipe finished successfully!");

  } catch (error) {
    console.error("❌ Wipe failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  process.exit(1);
});
