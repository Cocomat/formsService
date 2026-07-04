import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvitationDto } from "./invitations.dto";

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(projectId: string, formId?: string) {
    return this.prisma.invitation.findMany({
      where: { projectId, formId },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(projectId: string, formId: string, dto: CreateInvitationDto, actor?: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, projectId } });
    if (!form) throw new NotFoundException("Form not found");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.expiresInDays ?? 14));
    const invitation = await this.prisma.invitation.create({
      data: {
        projectId,
        formId,
        email: dto.email,
        token: randomUUID(),
        expiresAt
      }
    });
    await this.audit.record({
      projectId,
      actor,
      action: "invitation.created",
      entity: "Invitation",
      entityId: invitation.id,
      metadata: { email: dto.email, expiresAt: expiresAt.toISOString() }
    });
    return invitation;
  }

  async markOpened(token: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException("Invitation not found");
    return this.prisma.invitation.update({
      where: { token },
      data: { status: "OPENED", openedAt: new Date() }
    });
  }
}
