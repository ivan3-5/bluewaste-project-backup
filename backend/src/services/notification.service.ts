import prisma from "../config/database";
import { NotificationType } from "@prisma/client";
import {
  getPaginationParams,
  buildPaginatedResponse,
} from "../utils/pagination";

export class NotificationService {
  static async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    reportId?: string;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type as NotificationType,
        reportId: data.reportId,
      },
    });
  }

  static async getUserNotifications(
    userId: string,
    filters: { page?: string; limit?: string },
  ) {
    const pagination = getPaginationParams({
      page: filters.page,
      limit: filters.limit,
    });

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        include: {
          report: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return buildPaginatedResponse(notifications, total, pagination);
  }

  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  static async notifyAdmins(
    title: string,
    message: string,
    reportId?: string,
    type?: string,
  ) {
    const admins = await prisma.user.findMany({
      where: { role: "LGU_ADMIN", isActive: true },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.create({
          userId: admin.id,
          title,
          message,
          type: (type || "SYSTEM") as any,
          reportId,
        }),
      ),
    );
  }
}
