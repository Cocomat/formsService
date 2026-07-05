import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthRequest, auditActor } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateInvitationDto } from "./invitations.dto";
import { InvitationsService } from "./invitations.service";

@ApiTags("invitations")
@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get("projects/:projectId/invitations")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  list(@Param("projectId") projectId: string) {
    return this.invitations.list(projectId);
  }

  @Post("projects/:projectId/forms/:formId/invitations")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("service-admin", "project-admin", "form-editor")
  create(@Param("projectId") projectId: string, @Param("formId") formId: string, @Body() dto: CreateInvitationDto, @Req() req: AuthRequest) {
    return this.invitations.create(projectId, formId, dto, auditActor(req.user));
  }

  @Patch("public/invitations/:token/opened")
  markOpened(@Param("token") token: string) {
    return this.invitations.markOpened(token);
  }
}
