import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectRole, TenantRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ROLES_KEY } from "./roles.decorator";
import { AuthRequest } from "./auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required?.length) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthRequest & { params?: { tenantId?: string; projectId?: string; id?: string } }>();
    const roles = request.user?.roles ?? [];
    if (required.some((role) => roles.includes(role))) {
      return true;
    }

    const email = request.user?.email;
    if (!email) {
      return false;
    }

    const tenantId = await this.resolveTenantId(request.params);
    if (!tenantId) {
      return false;
    }

    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId, email } }
    });
    if (tenantUser && required.some((role) => tenantRoleAllows(tenantUser.role, role))) {
      return true;
    }

    const projectId = request.params?.projectId ?? request.params?.id;
    if (!projectId) {
      return false;
    }

    const projectUser = await this.prisma.projectUser.findUnique({
      where: { projectId_email: { projectId, email } }
    });
    return projectUser ? required.some((role) => projectRoleAllows(projectUser.role, role)) : false;
  }

  private async resolveTenantId(params?: { tenantId?: string; projectId?: string; id?: string }) {
    if (params?.tenantId) {
      return params.tenantId;
    }
    const projectId = params?.projectId ?? params?.id;
    if (!projectId) {
      return null;
    }
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { tenantId: true }
    });
    return project?.tenantId ?? null;
  }
}

const roleRank: Record<ProjectRole, number> = {
  SERVICE_ADMIN: 4,
  PROJECT_ADMIN: 3,
  FORM_EDITOR: 2,
  VIEWER: 1
};

const oidcToProjectRole: Record<string, ProjectRole> = {
  "service-admin": ProjectRole.SERVICE_ADMIN,
  "project-admin": ProjectRole.PROJECT_ADMIN,
  "form-editor": ProjectRole.FORM_EDITOR,
  viewer: ProjectRole.VIEWER
};

const tenantRoleRank: Record<TenantRole, number> = {
  TENANT_ADMIN: 4,
  PROJECT_ADMIN: 3,
  FORM_EDITOR: 2,
  VIEWER: 1
};

const oidcToTenantRole: Record<string, TenantRole> = {
  "service-admin": TenantRole.TENANT_ADMIN,
  "project-admin": TenantRole.PROJECT_ADMIN,
  "form-editor": TenantRole.FORM_EDITOR,
  viewer: TenantRole.VIEWER
};

function projectRoleAllows(actual: ProjectRole, required: string) {
  const requiredProjectRole = oidcToProjectRole[required];
  return requiredProjectRole ? roleRank[actual] >= roleRank[requiredProjectRole] : false;
}

function tenantRoleAllows(actual: TenantRole, required: string) {
  const requiredTenantRole = oidcToTenantRole[required];
  return requiredTenantRole ? tenantRoleRank[actual] >= tenantRoleRank[requiredTenantRole] : false;
}
