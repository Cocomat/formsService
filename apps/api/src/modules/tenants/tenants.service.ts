import { Injectable, NotFoundException } from "@nestjs/common";
import { LifecycleStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTenantDto, UpdateTenantDto, UpdateTenantUserDto, UpsertTenantUserDto } from "./tenants.dto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService
  ) {}

  list() {
    return this.prisma.tenant.findMany({
      include: {
        projects: {
          where: { status: LifecycleStatus.ACTIVE },
          include: {
            tenant: true,
            forms: {
              where: { status: LifecycleStatus.ACTIVE },
              include: {
                versions: { orderBy: { version: "desc" } },
                publications: true
              },
              orderBy: { updatedAt: "desc" }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { name: "asc" }
    });
  }

  async create(dto: CreateTenantDto, actor?: string) {
    const tenant = await this.prisma.tenant.create({ data: { name: dto.name } });
    await this.audit.record({
      actor,
      action: "tenant.created",
      entity: "Tenant",
      entityId: tenant.id,
      metadata: { name: tenant.name }
    });
    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto, actor?: string) {
    const existing = await this.ensureTenant(tenantId);
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { name: dto.name }
    });
    await this.audit.record({
      actor,
      action: "tenant.updated",
      entity: "Tenant",
      entityId: tenant.id,
      metadata: { previousName: existing.name, name: tenant.name }
    });
    return tenant;
  }

  async listUsers(tenantId: string) {
    await this.ensureTenant(tenantId);
    return this.prisma.tenantUser.findMany({
      where: { tenantId },
      orderBy: [{ role: "asc" }, { email: "asc" }]
    });
  }

  async listAudit(tenantId: string) {
    await this.ensureTenant(tenantId);
    const projects = await this.prisma.project.findMany({
      where: { tenantId },
      select: { id: true }
    });
    const projectIds = projects.map((project) => project.id);
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          { entity: "Tenant", entityId: tenantId },
          { metadata: { path: ["tenantId"], equals: tenantId } }
        ]
      },
      include: {
        project: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    const actorKeys = auditLogs.map((log) => log.actor).filter((actor): actor is string => Boolean(actor));
    const tenantUsers = actorKeys.length
      ? await this.prisma.tenantUser.findMany({
          where: {
            tenantId,
            OR: [{ subject: { in: actorKeys } }, { email: { in: actorKeys } }]
          },
          select: { email: true, subject: true }
        })
      : [];
    const actorNames = new Map<string, string>();
    tenantUsers.forEach((user) => {
      actorNames.set(user.email, user.email);
      if (user.subject) actorNames.set(user.subject, user.email);
    });

    const directFormIds = auditLogs
      .filter((log) => log.entity === "Form" && log.entityId)
      .map((log) => log.entityId as string);
    const metadataFormIds = auditLogs
      .map((log) => metadataString(log.metadata, "formId"))
      .filter((formId): formId is string => Boolean(formId));
    const versionIds = auditLogs
      .filter((log) => log.entity === "FormVersion" && log.entityId)
      .map((log) => log.entityId as string);
    const metadataVersionIds = auditLogs
      .map((log) => metadataString(log.metadata, "formVersionId"))
      .filter((versionId): versionId is string => Boolean(versionId));

    const formVersions = [...versionIds, ...metadataVersionIds].length
      ? await this.prisma.formVersion.findMany({
          where: { id: { in: [...versionIds, ...metadataVersionIds] } },
          select: { id: true, formId: true, form: { select: { id: true, name: true } } }
        })
      : [];
    const versionForms = new Map(formVersions.map((version) => [version.id, version.form]));
    const formIds = Array.from(new Set([
      ...directFormIds,
      ...metadataFormIds,
      ...formVersions.map((version) => version.formId)
    ]));
    const forms = formIds.length
      ? await this.prisma.form.findMany({
          where: { id: { in: formIds } },
          select: { id: true, name: true }
        })
      : [];
    const formNames = new Map(forms.map((form) => [form.id, form]));

    return auditLogs.map((log) => {
      const formId = log.entity === "Form"
        ? log.entityId
        : metadataString(log.metadata, "formId");
      const versionFormId = log.entity === "FormVersion"
        ? log.entityId
        : metadataString(log.metadata, "formVersionId");
      const form = (formId ? formNames.get(formId) : undefined)
        ?? (versionFormId ? versionForms.get(versionFormId) : undefined);
      return {
        ...log,
        actorName: log.actor ? actorNames.get(log.actor) ?? log.actor : null,
        form: form ?? null
      };
    });
  }

  async upsertUser(tenantId: string, dto: UpsertTenantUserDto, actor?: string) {
    const tenant = await this.ensureTenant(tenantId);
    const user = await this.prisma.tenantUser.upsert({
      where: { tenantId_email: { tenantId, email: dto.email } },
      update: { role: dto.role, subject: dto.subject },
      create: { tenantId, email: dto.email, role: dto.role, subject: dto.subject }
    });
    await this.audit.record({
      actor,
      action: "tenant.user_upserted",
      entity: "TenantUser",
      entityId: user.id,
      metadata: { tenantId, email: user.email, role: user.role }
    });
    await this.mail.sendTenantUserInvitation({
      email: user.email,
      role: user.role,
      tenantName: tenant.name
    });
    await this.audit.record({
      actor,
      action: "tenant.user_invitation_sent",
      entity: "TenantUser",
      entityId: user.id,
      metadata: { tenantId, email: user.email, role: user.role }
    });
    return user;
  }

  async updateUser(tenantId: string, userId: string, dto: UpdateTenantUserDto, actor?: string) {
    await this.ensureTenant(tenantId);
    const existing = await this.prisma.tenantUser.findFirst({ where: { id: userId, tenantId } });
    if (!existing) throw new NotFoundException("Tenant user not found");
    const user = await this.prisma.tenantUser.update({
      where: { id: userId },
      data: { role: dto.role }
    });
    await this.audit.record({
      actor,
      action: "tenant.user_updated",
      entity: "TenantUser",
      entityId: user.id,
      metadata: { tenantId, email: user.email, role: user.role }
    });
    return user;
  }

  async removeUser(tenantId: string, userId: string, actor?: string) {
    await this.ensureTenant(tenantId);
    const existing = await this.prisma.tenantUser.findFirst({ where: { id: userId, tenantId } });
    if (!existing) throw new NotFoundException("Tenant user not found");
    await this.prisma.tenantUser.delete({ where: { id: userId } });
    await this.audit.record({
      actor,
      action: "tenant.user_removed",
      entity: "TenantUser",
      entityId: userId,
      metadata: { tenantId, email: existing.email, role: existing.role }
    });
    return { deleted: true };
  }

  private async ensureTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant not found");
    return tenant;
  }
}

function metadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}
