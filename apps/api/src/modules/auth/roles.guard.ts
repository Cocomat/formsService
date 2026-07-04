import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectRole } from "@prisma/client";
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
    const request = context.switchToHttp().getRequest<AuthRequest & { params?: { projectId?: string; id?: string } }>();
    const roles = request.user?.roles ?? [];
    if (required.some((role) => roles.includes(role))) {
      return true;
    }

    const projectId = request.params?.projectId ?? request.params?.id;
    const email = request.user?.email;
    if (!projectId || !email) {
      return false;
    }

    const projectUser = await this.prisma.projectUser.findUnique({
      where: { projectId_email: { projectId, email } }
    });
    if (!projectUser) {
      return false;
    }
    return required.some((role) => projectRoleAllows(projectUser.role, role));
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

function projectRoleAllows(actual: ProjectRole, required: string) {
  const requiredProjectRole = oidcToProjectRole[required];
  return requiredProjectRole ? roleRank[actual] >= roleRank[requiredProjectRole] : false;
}
