import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AuthRequest, auditActor } from "../auth/auth.types";
import { CreateProjectDto, InviteProjectUserDto, UpdateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.list();
  }

  @Post()
  @Roles("service-admin")
  create(@Body() dto: CreateProjectDto, @Req() req: AuthRequest) {
    return this.projects.create(dto, auditActor(req.user));
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.projects.get(id);
  }

  @Patch(":id")
  @Roles("service-admin", "project-admin")
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto, @Req() req: AuthRequest) {
    return this.projects.update(id, dto, auditActor(req.user));
  }

  @Delete(":id/permanent")
  @Roles("service-admin", "project-admin")
  permanentlyDelete(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.projects.permanentlyDelete(id, auditActor(req.user));
  }

  @Delete(":id")
  @Roles("service-admin", "project-admin")
  archive(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.projects.archive(id, auditActor(req.user));
  }

  @Post(":id/users")
  @Roles("service-admin", "project-admin")
  invite(@Param("id") id: string, @Body() dto: InviteProjectUserDto, @Req() req: AuthRequest) {
    return this.projects.inviteUser(id, dto, auditActor(req.user));
  }
}
