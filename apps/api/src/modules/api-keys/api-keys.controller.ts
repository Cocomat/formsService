import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthRequest } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateApiKeyDto } from "./api-keys.dto";
import { ApiKeysService } from "./api-keys.service";

@ApiTags("api-keys")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("projects/:projectId/api-keys")
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @Roles("service-admin", "project-admin")
  list(@Param("projectId") projectId: string) {
    return this.apiKeys.list(projectId);
  }

  @Post()
  @Roles("service-admin", "project-admin")
  create(@Param("projectId") projectId: string, @Body() dto: CreateApiKeyDto, @Req() req: AuthRequest) {
    return this.apiKeys.create(projectId, dto.name, req.user?.subject);
  }
}
