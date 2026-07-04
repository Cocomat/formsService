import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string, formId: string) {
    return this.prisma.submission.findMany({
      where: { projectId, formId },
      include: { formVersion: true },
      orderBy: { submittedAt: "desc" }
    });
  }

  async get(projectId: string, id: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { projectId, id },
      include: { form: true, formVersion: true }
    });
    if (!submission) throw new NotFoundException("Submission not found");
    return submission;
  }

  async csv(projectId: string, formId: string) {
    const submissions = await this.list(projectId, formId);
    const rows = submissions.map((submission) => ({
      id: submission.id,
      submittedAt: submission.submittedAt.toISOString(),
      formVersion: submission.formVersion.version,
      language: submission.language,
      data: JSON.stringify(submission.data)
    }));
    const headers = ["id", "submittedAt", "formVersion", "language", "data"];
    return [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(","))
    ].join("\n");
  }
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}
