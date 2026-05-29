import { Request, Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { Role } from "@prisma/client";
import {
  getPaginationParams,
  buildPaginatedResponse,
} from "../utils/pagination";
import { hashPassword } from "../utils/password";
import { sendError } from "../utils/http";

export class UserController {
  static async getFieldWorkers(req: AuthRequest, res: Response) {
    try {
      const workers = await prisma.user.findMany({
        where: { role: Role.FIELD_WORKER, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          _count: { select: { assignedReports: true } },
        },
        orderBy: { firstName: "asc" },
      });
      res.json(workers);
    } catch (error) {
      sendError(res, 500, "Failed to fetch field workers", "USER_FETCH_FAILED");
    }
  }

  static async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const pagination = getPaginationParams(req.query as any);
      const roleFilter = req.query.role as string | undefined;
      const search = req.query.search as string | undefined;

      const where: any = {};
      if (roleFilter) {
        const normalizedRole = roleFilter.toUpperCase() as Role;
        if (!Object.values(Role).includes(normalizedRole)) {
          return sendError(res, 400, "Invalid role filter", "VALIDATION_ERROR");
        }
        where.role = normalizedRole;
      }
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
            isActive: true,
            createdAt: true,
            _count: { select: { reports: true, assignedReports: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
        prisma.user.count({ where }),
      ]);

      res.json(buildPaginatedResponse(users, total, pagination));
    } catch (error) {
      sendError(res, 500, "Failed to fetch users", "USER_FETCH_FAILED");
    }
  }

  static async createUser(req: AuthRequest, res: Response) {
    try {
      const { email, password, firstName, lastName, role, phone } =
        req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        return sendError(
          res,
          400,
          "Missing required fields",
          "VALIDATION_ERROR",
        );
      }

      if (!Object.values(Role).includes(role)) {
        return sendError(res, 400, "Invalid role", "VALIDATION_ERROR");
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return sendError(res, 409, "Email already registered", "EMAIL_TAKEN");
      }

      const hashedPassword = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          phone: phone || null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          _count: { select: { reports: true, assignedReports: true } },
        },
      });

      res.status(201).json(user);
    } catch (error) {
      sendError(res, 500, "Failed to create user", "USER_CREATE_FAILED");
    }
  }

  static async updateUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role, phone, isActive } = req.body;

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return sendError(res, 404, "User not found", "USER_NOT_FOUND");
      }

      if (role && !Object.values(Role).includes(role)) {
        return sendError(res, 400, "Invalid role", "VALIDATION_ERROR");
      }

      if (email && email !== existing.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email } });
        if (emailTaken) {
          return sendError(res, 409, "Email already in use", "EMAIL_TAKEN");
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(email !== undefined && { email }),
          ...(role !== undefined && { role }),
          ...(phone !== undefined && { phone }),
          
          ...(isActive !== undefined && { isActive }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          _count: { select: { reports: true, assignedReports: true } },
        },
      });

      res.json(user);
    } catch (error) {
      sendError(res, 500, "Failed to update user", "USER_UPDATE_FAILED");
    }
  }

  static async deleteUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const requestingUserId = req.user?.id;

      if (id === requestingUserId) {
        return sendError(
          res,
          400,
          "Cannot delete your own account",
          "VALIDATION_ERROR",
        );
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return sendError(res, 404, "User not found", "USER_NOT_FOUND");
      }

      if (!existing.isActive) {
        return res.json({ message: "User already deactivated" });
      }

      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      sendError(res, 500, "Failed to delete user", "USER_DELETE_FAILED");
    }
  }
}
