import { Injectable, NotFoundException } from "@nestjs/common";
import { LifecycleStatus, ProjectRole } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto, InviteProjectUserDto, UpdateProjectDto } from "./projects.dto";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list() {
    return this.prisma.project.findMany({
      where: { status: LifecycleStatus.ACTIVE },
      include: {
        tenant: true,
        users: true,
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
    });
  }

  async create(dto: CreateProjectDto, actor?: string) {
    const tenant = dto.tenantId
      ? await this.prisma.tenant.findUniqueOrThrow({ where: { id: dto.tenantId } })
      : await this.prisma.tenant.upsert({
          where: { id: "default" },
          update: {},
          create: { id: "default", name: "Default Organisation" }
        });
    const project = await this.prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        description: dto.description,
        languages: dto.languages
      }
    });
    await this.audit.record({ projectId: project.id, actor, action: "project.created", entity: "Project", entityId: project.id });
    return project;
  }

  async get(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        tenant: true,
        users: true,
        forms: {
          where: { status: LifecycleStatus.ACTIVE },
          include: {
            versions: { orderBy: { version: "desc" } },
            publications: true
          },
          orderBy: { updatedAt: "desc" }
        },
        apiKeys: true
      }
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, actor?: string) {
    await this.get(id);
    const project = await this.prisma.project.update({ where: { id }, data: dto });
    await this.audit.record({ projectId: id, actor, action: "project.updated", entity: "Project", entityId: id });
    return project;
  }

  async archive(id: string, actor?: string) {
    await this.get(id);
    const project = await this.prisma.project.update({ where: { id }, data: { status: LifecycleStatus.ARCHIVED } });
    await this.audit.record({ projectId: id, actor, action: "project.archived", entity: "Project", entityId: id });
    return project;
  }

  async permanentlyDelete(id: string, actor?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        forms: { select: { id: true } },
        users: { select: { id: true } },
        invitations: { select: { id: true } },
        apiKeys: { select: { id: true } }
      }
    });
    if (!project) throw new NotFoundException("Project not found");

    const formIds = project.forms.map((form) => form.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.deleteMany({ where: { projectId: id } });
      await tx.apiKey.deleteMany({ where: { projectId: id } });
      await tx.projectUser.deleteMany({ where: { projectId: id } });

      if (formIds.length > 0) {
        await tx.formPublication.deleteMany({ where: { formId: { in: formIds } } });
        await tx.submission.deleteMany({ where: { formId: { in: formIds } } });
        await tx.formVersion.deleteMany({ where: { formId: { in: formIds } } });
        await tx.form.deleteMany({ where: { id: { in: formIds } } });
      }

      await tx.project.delete({ where: { id } });
    });

    await this.audit.record({
      actor,
      action: "project.permanently_deleted",
      entity: "Project",
      entityId: id,
      metadata: {
        name: project.name,
        tenantId: project.tenantId,
        forms: project.forms.length,
        users: project.users.length,
        invitations: project.invitations.length,
        apiKeys: project.apiKeys.length
      }
    });

    return { id, deleted: true };
  }

  async inviteUser(projectId: string, dto: InviteProjectUserDto, actor?: string) {
    await this.get(projectId);
    const user = await this.prisma.projectUser.upsert({
      where: { projectId_email: { projectId, email: dto.email } },
      update: { role: dto.role },
      create: { projectId, email: dto.email, role: dto.role ?? ProjectRole.VIEWER }
    });
    await this.audit.record({
      projectId,
      actor,
      action: "project.user_invited",
      entity: "ProjectUser",
      entityId: user.id,
      metadata: { email: dto.email, role: dto.role }
    });
    return user;
  }
}
