import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(projectId: string) {
    return this.prisma.apiKey.findMany({
      where: { projectId, revokedAt: null },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true }
    });
  }

  async create(projectId: string, name: string, actor?: string) {
    const plain = `fs_${randomBytes(32).toString("hex")}`;
    const apiKey = await this.prisma.apiKey.create({
      data: { projectId, name, keyHash: await argon2.hash(plain) },
      select: { id: true, name: true, createdAt: true }
    });
    await this.audit.record({ projectId, actor, action: "api_key.created", entity: "ApiKey", entityId: apiKey.id });
    return { ...apiKey, key: plain };
  }

  async verify(projectId: string, key?: string) {
    if (!key) throw new UnauthorizedException("Missing API key");
    const keys = await this.prisma.apiKey.findMany({ where: { projectId, revokedAt: null } });
    for (const candidate of keys) {
      if (await argon2.verify(candidate.keyHash, key)) {
        await this.prisma.apiKey.update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } });
        await this.audit.record({ projectId, action: "api.access", entity: "ApiKey", entityId: candidate.id });
        return candidate;
      }
    }
    throw new UnauthorizedException("Invalid API key");
  }
}
