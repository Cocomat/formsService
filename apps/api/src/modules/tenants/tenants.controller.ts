import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthRequest } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateTenantDto, UpdateTenantDto, UpdateTenantUserDto, UpsertTenantUserDto } from "./tenants.dto";
import { TenantsService } from "./tenants.service";

@ApiTags("tenants")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @Roles("service-admin", "project-admin")
  list() {
    return this.tenants.list();
  }

  @Post()
  @Roles("service-admin", "project-admin")
  create(@Body() dto: CreateTenantDto, @Req() req: AuthRequest) {
    return this.tenants.create(dto, req.user?.subject);
  }

  @Patch(":tenantId")
  @Roles("service-admin")
  update(@Param("tenantId") tenantId: string, @Body() dto: UpdateTenantDto, @Req() req: AuthRequest) {
    return this.tenants.update(tenantId, dto, req.user?.subject);
  }

  @Get(":tenantId/audit")
  @Roles("service-admin")
  listAudit(@Param("tenantId") tenantId: string) {
    return this.tenants.listAudit(tenantId);
  }

  @Get(":tenantId/users")
  @Roles("service-admin", "project-admin")
  listUsers(@Param("tenantId") tenantId: string) {
    return this.tenants.listUsers(tenantId);
  }

  @Post(":tenantId/users")
  @Roles("service-admin", "project-admin")
  upsertUser(@Param("tenantId") tenantId: string, @Body() dto: UpsertTenantUserDto, @Req() req: AuthRequest) {
    return this.tenants.upsertUser(tenantId, dto, req.user?.subject);
  }

  @Patch(":tenantId/users/:userId")
  @Roles("service-admin", "project-admin")
  updateUser(
    @Param("tenantId") tenantId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateTenantUserDto,
    @Req() req: AuthRequest
  ) {
    return this.tenants.updateUser(tenantId, userId, dto, req.user?.subject);
  }

  @Delete(":tenantId/users/:userId")
  @Roles("service-admin", "project-admin")
  removeUser(@Param("tenantId") tenantId: string, @Param("userId") userId: string, @Req() req: AuthRequest) {
    return this.tenants.removeUser(tenantId, userId, req.user?.subject);
  }
}
