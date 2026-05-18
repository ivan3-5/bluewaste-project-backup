import prisma from "../config/database";

export interface ZonePoint {
  lat: number;
  lng: number;
}

export class ReportingZoneService {
  static async list(activeOnly = true) {
    return prisma.reportingZone.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        coordinates: true,
        isActive: true,
        createdAt: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  static async create(data: {
    name: string;
    coordinates: ZonePoint[];
    createdById: string;
  }) {
    if (!data.name?.trim()) throw new Error("Zone name is required");
    if (!Array.isArray(data.coordinates) || data.coordinates.length < 3) {
      throw new Error("A zone needs at least 3 coordinate points");
    }

    return prisma.reportingZone.create({
      data: {
        name: data.name.trim(),
        coordinates: data.coordinates as object[],
        createdById: data.createdById,
      },
    });
  }

  static async update(
    id: string,
    data: { name?: string; coordinates?: ZonePoint[]; isActive?: boolean },
  ) {
    const zone = await prisma.reportingZone.findUnique({ where: { id } });
    if (!zone) throw new Error("Reporting zone not found");

    if (data.coordinates !== undefined && data.coordinates.length < 3) {
      throw new Error("A zone needs at least 3 coordinate points");
    }

    return prisma.reportingZone.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.coordinates !== undefined
          ? { coordinates: data.coordinates as object[] }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  static async delete(id: string) {
    const zone = await prisma.reportingZone.findUnique({ where: { id } });
    if (!zone) throw new Error("Reporting zone not found");
    await prisma.reportingZone.delete({ where: { id } });
  }
}
