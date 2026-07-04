import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ApiKeysService } from "./api-keys.service";
import { AuthRequest } from "../auth/auth.types";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest & { params: { projectId: string }; headers: Record<string, string | undefined> }>();
    const apiKey = await this.apiKeys.verify(request.params.projectId, request.headers["x-api-key"]);
    request.projectApiKey = { projectId: apiKey.projectId, apiKeyId: apiKey.id };
    return true;
  }
}
