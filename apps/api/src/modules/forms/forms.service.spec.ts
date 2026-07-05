import { Test } from "@nestjs/testing";
import { FormsService } from "./forms.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { FormVersionStatus } from "@prisma/client";

describe("FormsService", () => {
  it("keeps the public link stable when publishing a new version", async () => {
    const tx = {
      formVersion: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ id: "version-2", status: "PUBLISHED" })
      },
      formPublication: {
        findFirst: jest.fn().mockResolvedValue({ id: "publication-1", publicSlug: "stable-slug" }),
        update: jest.fn().mockResolvedValue({ id: "publication-1", publicSlug: "stable-slug", formVersionId: "version-2" }),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 })
      }
    };
    const prisma = {
      form: {
        findFirst: jest.fn().mockResolvedValue({ id: "form-1", projectId: "project-1", versions: [], publications: [] })
      },
      formVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: "version-2", version: 2, status: "DRAFT" })
      },
      $transaction: jest.fn((callback) => callback(tx))
    };
    const service = new FormsService(prisma as unknown as PrismaService, { record: jest.fn() } as unknown as AuditService);

    const result = await service.publish("project-1", "form-1");

    expect(result.publication.publicSlug).toBe("stable-slug");
    expect(tx.formPublication.update).toHaveBeenCalledWith({
      where: { id: "publication-1" },
      data: { formVersionId: "version-2", active: true }
    });
    expect(tx.formPublication.create).not.toHaveBeenCalled();
  });

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

  it("restores a published version into a new draft", async () => {
    const audit = { record: jest.fn() };
    const prisma = {
      form: {
        findFirst: jest.fn().mockResolvedValue({ id: "form-1", projectId: "project-1", versions: [], publications: [] })
      },
      formVersion: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: "version-1",
            formId: "form-1",
            version: 1,
            status: FormVersionStatus.ARCHIVED,
            schema: { components: [{ key: "old" }] },
            translations: { de: {} },
            publishedAt: new Date("2026-01-01T10:00:00Z")
          })
          .mockResolvedValueOnce({
            id: "version-2",
            formId: "form-1",
            version: 2,
            status: FormVersionStatus.PUBLISHED
          }),
        create: jest.fn().mockResolvedValue({ id: "version-3", version: 3, status: FormVersionStatus.DRAFT })
      }
    };
    const service = new FormsService(prisma as unknown as PrismaService, audit as unknown as AuditService);

    const draft = await service.restoreVersion("project-1", "form-1", "version-1", "actor-1");

    expect(draft.version).toBe(3);
    expect(prisma.formVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        formId: "form-1",
        version: 3,
        status: FormVersionStatus.DRAFT,
        schema: { components: [{ key: "old" }] }
      })
    }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "form.version_restored",
      metadata: expect.objectContaining({ sourceVersionId: "version-1", sourceVersion: 1 })
    }));
  });
});
