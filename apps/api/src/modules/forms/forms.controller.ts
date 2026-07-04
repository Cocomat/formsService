import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthRequest } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateFormDto, UpdateDraftDto, UpdateFormDto } from "./forms.dto";
import { FormsService } from "./forms.service";

@ApiTags("forms")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("projects/:projectId/forms")
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.forms.list(projectId);
  }

  @Get("archived")
  listArchived(@Param("projectId") projectId: string) {
    return this.forms.listArchived(projectId);
  }

  @Post()
  @Roles("service-admin", "project-admin", "form-editor")
  create(@Param("projectId") projectId: string, @Body() dto: CreateFormDto, @Req() req: AuthRequest) {
    return this.forms.create(projectId, dto, req.user?.subject);
  }

  @Get(":formId")
  get(@Param("projectId") projectId: string, @Param("formId") formId: string) {
    return this.forms.get(projectId, formId);
  }

  @Patch(":formId")
  @Roles("service-admin", "project-admin", "form-editor")
  update(@Param("projectId") projectId: string, @Param("formId") formId: string, @Body() dto: UpdateFormDto, @Req() req: AuthRequest) {
    return this.forms.update(projectId, formId, dto, req.user?.subject);
  }

  @Patch(":formId/draft")
  @Roles("service-admin", "project-admin", "form-editor")
  updateDraft(@Param("projectId") projectId: string, @Param("formId") formId: string, @Body() dto: UpdateDraftDto, @Req() req: AuthRequest) {
    return this.forms.updateDraft(projectId, formId, dto, req.user?.subject);
  }

  @Post(":formId/duplicate")
  @Roles("service-admin", "project-admin", "form-editor")
  duplicate(@Param("projectId") projectId: string, @Param("formId") formId: string, @Req() req: AuthRequest) {
    return this.forms.duplicate(projectId, formId, req.user?.subject);
  }

  @Post(":formId/publish")
  @Roles("service-admin", "project-admin")
  publish(@Param("projectId") projectId: string, @Param("formId") formId: string, @Req() req: AuthRequest) {
    return this.forms.publish(projectId, formId, req.user?.subject);
  }

  @Delete(":formId/permanent")
  @Roles("service-admin", "project-admin")
  permanentlyDelete(@Param("projectId") projectId: string, @Param("formId") formId: string, @Req() req: AuthRequest) {
    return this.forms.permanentlyDelete(projectId, formId, req.user?.subject);
  }

  @Delete(":formId")
  @Roles("service-admin", "project-admin")
  archive(@Param("projectId") projectId: string, @Param("formId") formId: string, @Req() req: AuthRequest) {
    return this.forms.archive(projectId, formId, req.user?.subject);
  }
}
