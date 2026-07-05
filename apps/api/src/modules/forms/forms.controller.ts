import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthRequest, auditActor } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateFormDto, ImportFormDto, UpdateDraftDto, UpdateFormDto } from "./forms.dto";
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
    return this.forms.create(projectId, dto, auditActor(req.user));
  }

  @Get(":formId/export")
  @Roles("service-admin", "project-admin", "form-editor")
  export(@Param("projectId") projectId: string, @Param("formId") formId: string) {
    return this.forms.export(projectId, formId);
  }

  @Post(":formId/import")
  @Roles("service-admin", "project-admin", "form-editor")
  import(@Param("projectId") projectId: string, @Param("formId") formId: string, @Body() dto: ImportFormDto, @Req() req: AuthRequest) {
    return this.forms.importDraft(projectId, formId, dto, auditActor(req.user));
  }

  @Get(":formId/versions/published")
  @Roles("service-admin", "project-admin", "form-editor", "viewer")
  listPublishedVersions(@Param("projectId") projectId: string, @Param("formId") formId: string) {
    return this.forms.listPublishedVersions(projectId, formId);
  }

  @Post(":formId/versions/:versionId/restore")
  @Roles("service-admin", "project-admin", "form-editor")
  restoreVersion(
    @Param("projectId") projectId: string,
    @Param("formId") formId: string,
    @Param("versionId") versionId: string,
    @Req() req: AuthRequest
  ) {
    return this.forms.restoreVersion(projectId, formId, versionId, auditActor(req.user));
  }

  @Get(":formId")
  get(@Param("projectId") projectId: string, @Param("formId") formId: string) {
    return this.forms.get(projectId, formId);
  }

  @Patch(":formId")
  @Roles("service-admin", "project-admin", "form-editor")
  update(@Param("projectId") projectId: string, @Param("formId") formId: string, @Body() dto: UpdateFormDto, @Req() req: AuthRequest) {
    return this.forms.update(projectId, formId, dto, auditActor(req.user));
  }

  @Patch(":formId/draft")
  @Roles("service-admin", "project-admin", "form-editor")
  updateDraft(@Param("projectId") projectId: string, @Param("formId") formId: string, @Body() dto: UpdateDraftDto, @Req() req: AuthRequest) {
    return this.forms.updateDraft(projectId, formId, dto, auditActor(req.user));
  }

  @Post(":formId/duplicate")
  @Roles("service-admin", "project-admin", "form-editor")
  duplicate(@Param("projectId") projectId: string, @Param("formId") formId: string, @Req() req: AuthRequest) {
    return this.forms.duplicate(projectId, formId, auditActor(req.user));
  }

  @Post(":formId/publish")
  @Roles("service-admin", "project-admin")
  publish(@Param("projectId") projectId: string, @Param("formId") formId: string, @Req() req: AuthRequest) {
    return this.forms.publish(projectId, formId, auditActor(req.user));
  }

  @Delete(":formId/permanent")
  @Roles("service-admin", "project-admin")
  permanentlyDelete(@Param("projectId") projectId: string, @Param("formId") formId: string, @Req() req: AuthRequest) {
    return this.forms.permanentlyDelete(projectId, formId, auditActor(req.user));
  }

  @Delete(":formId")
  @Roles("service-admin", "project-admin")
  archive(@Param("projectId") projectId: string, @Param("formId") formId: string, @Req() req: AuthRequest) {
    return this.forms.archive(projectId, formId, auditActor(req.user));
  }
}
