import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FormVersionStatus, LifecycleStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFormDto, ImportFormDto, SubmitFormDto, UpdateDraftDto, UpdateFormDto } from "./forms.dto";

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(projectId: string) {
    return this.prisma.form.findMany({
      where: { projectId, status: LifecycleStatus.ACTIVE },
      include: { versions: { orderBy: { version: "desc" } }, publications: true },
      orderBy: { updatedAt: "desc" }
    });
  }

  listArchived(projectId: string) {
    return this.prisma.form.findMany({
      where: { projectId, status: LifecycleStatus.ARCHIVED },
      include: { versions: { orderBy: { version: "desc" } }, publications: true },
      orderBy: { updatedAt: "desc" }
    });
  }

  async create(projectId: string, dto: CreateFormDto, actor?: string) {
    const form = await this.prisma.form.create({
      data: {
        projectId,
        name: dto.name,
        slug: dto.slug,
        versions: {
          create: {
            version: 1,
            status: FormVersionStatus.DRAFT,
            schema: asJson(dto.schema),
            translations: asJson(dto.translations ?? {}),
            createdBy: actor
          }
        }
      },
      include: { versions: true }
    });
    await this.audit.record({ projectId, actor, action: "form.created", entity: "Form", entityId: form.id });
    return form;
  }

  async get(projectId: string, formId: string) {
    const form = await this.prisma.form.findFirst({
      where: { id: formId, projectId },
      include: { versions: { orderBy: { version: "desc" } }, publications: true }
    });
    if (!form) throw new NotFoundException("Form not found");
    return form;
  }

  async updateDraft(projectId: string, formId: string, dto: UpdateDraftDto, actor?: string) {
    await this.get(projectId, formId);
    const latest = await this.prisma.formVersion.findFirst({ where: { formId }, orderBy: { version: "desc" } });
    const versionNumber = latest?.status === FormVersionStatus.DRAFT ? latest.version : (latest?.version ?? 0) + 1;
    const version = latest?.status === FormVersionStatus.DRAFT
      ? await this.prisma.formVersion.update({
          where: { id: latest.id },
          data: { schema: asJson(dto.schema), translations: asJson(dto.translations ?? {}), createdBy: actor }
        })
      : await this.prisma.formVersion.create({
          data: {
            formId,
            version: versionNumber,
            status: FormVersionStatus.DRAFT,
            schema: asJson(dto.schema),
            translations: asJson(dto.translations ?? {}),
            createdBy: actor
          }
        });
    await this.audit.record({ projectId, actor, action: "form.draft_changed", entity: "FormVersion", entityId: version.id });
    return version;
  }

  async export(projectId: string, formId: string) {
    const form = await this.get(projectId, formId);
    const version = form.versions.find((item) => item.status === FormVersionStatus.DRAFT) ?? form.versions[0];
    if (!version) throw new NotFoundException("Form version not found");

    return {
      format: "formularservice.form",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      name: form.name,
      schema: version.schema,
      translations: version.translations ?? {}
    };
  }

  async importDraft(projectId: string, formId: string, dto: ImportFormDto, actor?: string) {
    const schema = resolveImportedSchema(dto);
    const version = await this.updateDraft(projectId, formId, {
      schema,
      translations: dto.translations ?? {}
    }, actor);
    if (dto.name) {
      await this.update(projectId, formId, { name: dto.name }, actor);
    }
    await this.audit.record({
      projectId,
      actor,
      action: "form.imported",
      entity: "FormVersion",
      entityId: version.id,
      metadata: { formId, name: dto.name }
    });
    return version;
  }

  async listPublishedVersions(projectId: string, formId: string) {
    await this.get(projectId, formId);
    return this.prisma.formVersion.findMany({
      where: {
        formId,
        publishedAt: { not: null },
        status: { in: [FormVersionStatus.PUBLISHED, FormVersionStatus.ARCHIVED] }
      },
      orderBy: { version: "desc" }
    });
  }

  async restoreVersion(projectId: string, formId: string, versionId: string, actor?: string) {
    await this.get(projectId, formId);
    const source = await this.prisma.formVersion.findFirst({
      where: {
        id: versionId,
        formId,
        publishedAt: { not: null },
        status: { in: [FormVersionStatus.PUBLISHED, FormVersionStatus.ARCHIVED] }
      }
    });
    if (!source) throw new NotFoundException("Published form version not found");

    const latest = await this.prisma.formVersion.findFirst({ where: { formId }, orderBy: { version: "desc" } });
    const versionNumber = latest?.status === FormVersionStatus.DRAFT ? latest.version : (latest?.version ?? 0) + 1;
    const version = latest?.status === FormVersionStatus.DRAFT
      ? await this.prisma.formVersion.update({
          where: { id: latest.id },
          data: {
            schema: source.schema as Prisma.InputJsonObject,
            translations: (source.translations ?? {}) as Prisma.InputJsonObject,
            createdBy: actor
          }
        })
      : await this.prisma.formVersion.create({
          data: {
            formId,
            version: versionNumber,
            status: FormVersionStatus.DRAFT,
            schema: source.schema as Prisma.InputJsonObject,
            translations: (source.translations ?? {}) as Prisma.InputJsonObject,
            createdBy: actor
          }
        });

    await this.audit.record({
      projectId,
      actor,
      action: "form.version_restored",
      entity: "FormVersion",
      entityId: version.id,
      metadata: { formId, sourceVersionId: source.id, sourceVersion: source.version }
    });
    return version;
  }

  async update(projectId: string, formId: string, dto: UpdateFormDto, actor?: string) {
    await this.get(projectId, formId);
    const form = await this.prisma.form.update({
      where: { id: formId },
      data: { name: dto.name }
    });
    await this.audit.record({
      projectId,
      actor,
      action: "form.updated",
      entity: "Form",
      entityId: formId,
      metadata: { name: dto.name }
    });
    return form;
  }

  async duplicate(projectId: string, formId: string, actor?: string) {
    const source = await this.get(projectId, formId);
    const draft = source.versions[0];
    return this.create(projectId, {
      name: `${source.name} Kopie`,
      slug: `${source.slug}-${randomUUID().slice(0, 8)}`,
      schema: draft.schema as Record<string, unknown>,
      translations: draft.translations as Record<string, unknown>
    }, actor);
  }

  async publish(projectId: string, formId: string, actor?: string) {
    await this.get(projectId, formId);
    const draft = await this.prisma.formVersion.findFirst({ where: { formId, status: FormVersionStatus.DRAFT }, orderBy: { version: "desc" } });
    if (!draft) throw new NotFoundException("No draft version to publish");

    const { published, publication } = await this.prisma.$transaction(async (tx) => {
      await tx.formVersion.updateMany({
        where: { formId, status: FormVersionStatus.PUBLISHED },
        data: { status: FormVersionStatus.ARCHIVED }
      });
      const published = await tx.formVersion.update({
        where: { id: draft.id },
        data: { status: FormVersionStatus.PUBLISHED, publishedAt: new Date() }
      });
      const existingPublication = await tx.formPublication.findFirst({
        where: { formId, active: true },
        orderBy: { createdAt: "asc" }
      }) ?? await tx.formPublication.findFirst({
        where: { formId },
        orderBy: { createdAt: "asc" }
      });
      const publication = existingPublication
        ? await tx.formPublication.update({
            where: { id: existingPublication.id },
            data: { formVersionId: published.id, active: true }
          })
        : await tx.formPublication.create({
            data: {
              formId,
              formVersionId: published.id,
              publicSlug: randomUUID()
            }
          });
      await tx.formPublication.updateMany({
        where: { formId, id: { not: publication.id } },
        data: { active: false }
      });
      return { published, publication };
    });
    await this.audit.record({ projectId, actor, action: "form.published", entity: "FormVersion", entityId: published.id });
    return { version: published, publication };
  }

  async archive(projectId: string, formId: string, actor?: string) {
    await this.get(projectId, formId);
    const form = await this.prisma.$transaction(async (tx) => {
      await tx.formPublication.updateMany({ where: { formId }, data: { active: false } });
      return tx.form.update({ where: { id: formId }, data: { status: LifecycleStatus.ARCHIVED } });
    });
    await this.audit.record({ projectId, actor, action: "form.archived", entity: "Form", entityId: formId });
    return form;
  }

  async permanentlyDelete(projectId: string, formId: string, actor?: string) {
    const form = await this.get(projectId, formId);
    if (form.status !== LifecycleStatus.ARCHIVED) {
      throw new BadRequestException("Only archived forms can be permanently deleted");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.deleteMany({ where: { projectId, formId } });
      await tx.formPublication.deleteMany({ where: { formId } });
      await tx.submission.deleteMany({ where: { formId } });
      await tx.formVersion.deleteMany({ where: { formId } });
      await tx.form.delete({ where: { id: formId } });
    });
    await this.audit.record({
      projectId,
      actor,
      action: "form.permanently_deleted",
      entity: "Form",
      entityId: formId,
      metadata: { name: form.name, slug: form.slug }
    });
    return { id: formId, deleted: true };
  }

  async getPublished(publicSlug: string) {
    const publication = await this.prisma.formPublication.findUnique({
      where: { publicSlug },
      include: { form: { include: { project: true } }, formVersion: true }
    });
    if (!publication?.active) throw new NotFoundException("Publication not found");
    return publication;
  }

  async submit(publicSlug: string, dto: SubmitFormDto) {
    const publication = await this.getPublished(publicSlug);
    const submission = await this.prisma.submission.create({
      data: {
        projectId: publication.form.projectId,
        formId: publication.formId,
        formVersionId: publication.formVersionId,
        data: asJson(dto.data),
        language: dto.language ?? "de"
      }
    });
    if (dto.invitationToken) {
      await this.prisma.invitation.updateMany({
        where: { token: dto.invitationToken },
        data: { status: "SUBMITTED", submittedAt: new Date() }
      });
    }
    await this.audit.record({
      projectId: publication.form.projectId,
      action: "submission.created",
      entity: "Submission",
      entityId: submission.id,
      metadata: { formVersionId: publication.formVersionId }
    });
    return submission;
  }
}

function asJson(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function resolveImportedSchema(dto: ImportFormDto): Record<string, unknown> {
  if (dto.schema && typeof dto.schema === "object") {
    return dto.schema;
  }
  if (Array.isArray((dto as Record<string, unknown>).components)) {
    return dto as Record<string, unknown>;
  }
  throw new BadRequestException("Import JSON must contain a schema or Form.io components");
}
