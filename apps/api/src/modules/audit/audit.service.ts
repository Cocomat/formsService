import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    projectId?: string;
    actor?: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        projectId: input.projectId,
        actor: input.actor,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata ?? {}
      }
    });
  }
}
