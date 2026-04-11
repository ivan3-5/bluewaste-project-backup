import prisma from "../config/database";
import { Prisma, Role } from "@prisma/client";

export class ResortBoxService {
  private static normalizeBounds(bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }) {
    return {
      minLat: Math.min(bounds.minLat, bounds.maxLat),
      maxLat: Math.max(bounds.minLat, bounds.maxLat),
      minLng: Math.min(bounds.minLng, bounds.maxLng),
      maxLng: Math.max(bounds.minLng, bounds.maxLng),
    };
  }

  private static async ensureValidOwner(ownerId: string) {
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!owner || owner.role !== Role.RESORT_ADMIN || !owner.isActive) {
      throw new Error("Invalid resort admin owner");
    }
  }

  private static async ensureUniqueName(name: string, excludeId?: string) {
    const existing = await prisma.resortBox.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error("A map box with this name already exists");
    }
  }

  private static async ensureNoOverlap(
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
    excludeId?: string,
  ) {
    const overlap = await prisma.resortBox.findFirst({
      where: {
        isActive: true,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
        minLat: { lte: bounds.maxLat },
        maxLat: { gte: bounds.minLat },
        minLng: { lte: bounds.maxLng },
        maxLng: { gte: bounds.minLng },
      },
      select: { id: true, name: true },
    });

    if (overlap) {
      throw new Error(`Map box overlaps with existing box: ${overlap.name}`);
    }
  }

  static async create(data: {
    name: string;
    description?: string;
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    ownerId: string;
    createdById: string;
  }) {
    const bounds = this.normalizeBounds(data);

    await this.ensureValidOwner(data.ownerId);
    await this.ensureUniqueName(data.name);
    await this.ensureNoOverlap(bounds);

    return prisma.resortBox.create({
      data: {
        name: data.name,
        description: data.description,
        ...bounds,
        ownerId: data.ownerId,
        createdById: data.createdById,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  static async list(options: {
    requesterRole: string;
    requesterId: string;
    includeInactive?: boolean;
  }) {
    const where: Prisma.ResortBoxWhereInput = {
      ...(options.includeInactive ? {} : { isActive: true }),
    };

    if (options.requesterRole === Role.RESORT_ADMIN) {
      where.ownerId = options.requesterId;
    }

    return prisma.resortBox.findMany({
      where,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { reports: true } },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      minLat?: number;
      maxLat?: number;
      minLng?: number;
      maxLng?: number;
      ownerId?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await prisma.resortBox.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Resort box not found");
    }

    if (data.ownerId) {
      await this.ensureValidOwner(data.ownerId);
    }

    if (data.name && data.name !== existing.name) {
      await this.ensureUniqueName(data.name, id);
    }

    const nextBounds = this.normalizeBounds({
      minLat: data.minLat ?? existing.minLat,
      maxLat: data.maxLat ?? existing.maxLat,
      minLng: data.minLng ?? existing.minLng,
      maxLng: data.maxLng ?? existing.maxLng,
    });

    if (
      data.minLat !== undefined ||
      data.maxLat !== undefined ||
      data.minLng !== undefined ||
      data.maxLng !== undefined
    ) {
      await this.ensureNoOverlap(nextBounds, id);
    }

    return prisma.resortBox.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...nextBounds,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  static async deactivate(id: string) {
    const existing = await prisma.resortBox.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Resort box not found");
    }

    return prisma.resortBox.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
