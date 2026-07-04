import { Controller, Get, Header, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiKeyGuard } from "../api-keys/api-key.guard";
import { SubmissionsService } from "./submissions.service";

@ApiTags("submissions")
@Controller()
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get("projects/:projectId/forms/:formId/submissions")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  list(@Param("projectId") projectId: string, @Param("formId") formId: string) {
    return this.submissions.list(projectId, formId);
  }

  @Get("projects/:projectId/submissions/:submissionId")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  get(@Param("projectId") projectId: string, @Param("submissionId") submissionId: string) {
    return this.submissions.get(projectId, submissionId);
  }

  @Get("projects/:projectId/forms/:formId/submissions.csv")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  @Header("content-type", "text/csv")
  exportCsv(@Param("projectId") projectId: string, @Param("formId") formId: string) {
    return this.submissions.csv(projectId, formId);
  }

  @Get("api/projects/:projectId/forms/:formId/submissions")
  @ApiSecurity("project-api-key")
  @UseGuards(ApiKeyGuard)
  apiList(@Param("projectId") projectId: string, @Param("formId") formId: string) {
    return this.submissions.list(projectId, formId);
  }
}
