import { Injectable, NotFoundException } from "@nestjs/common";
import { LifecycleStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTenantDto, UpdateTenantUserDto, UpsertTenantUserDto } from "./tenants.dto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
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

  async listUsers(tenantId: string) {
    await this.ensureTenant(tenantId);
    return this.prisma.tenantUser.findMany({
      where: { tenantId },
      orderBy: [{ role: "asc" }, { email: "asc" }]
    });
  }

  async upsertUser(tenantId: string, dto: UpsertTenantUserDto, actor?: string) {
    await this.ensureTenant(tenantId);
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
