import { Test } from "@nestjs/testing";
import { FormsService } from "./forms.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("FormsService", () => {
  it("uses the latest published version for public submissions", async () => {
    const prisma = {
      formPublication: {
        findUnique: jest.fn().mockResolvedValue({
          active: true,
          formId: "form-1",
          formVersionId: "version-2",
          form: { projectId: "project-1" },
          formVersion: { id: "version-2" }
        })
      },
      submission: {
        create: jest.fn().mockResolvedValue({ id: "submission-1", formVersionId: "version-2" })
      }
    };
    const service = new FormsService(prisma as unknown as PrismaService, { record: jest.fn() } as unknown as AuditService);

    const submission = await service.submit("public-slug", { data: { name: "Ada" }, language: "de" });

    expect(submission.formVersionId).toBe("version-2");
    expect(prisma.submission.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ formVersionId: "version-2" })
    }));
  });
});
