import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", database: "ok", timestamp: new Date().toISOString() };
  }

  @Get("tests")
  async tests() {
    const status = await readTestStatus();
    return {
      ...status,
      reportUrl: "/system/tests",
      command: "pnpm test:status"
    };
  }
}

async function readTestStatus() {
  const candidates = [
    resolve(process.cwd(), ".test-status.json"),
    resolve(process.cwd(), "../../.test-status.json")
  ];

  for (const file of candidates) {
    try {
      return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    } catch {
      // Try the next likely workspace root.
    }
  }

  return {
    status: "unknown",
    lastRunAt: null,
    durationMs: null,
    summary: "Noch kein protokollierter Testlauf vorhanden.",
    suites: []
  };
}
