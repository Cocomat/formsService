import { getAccessToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export type Project = {
  id: string;
  tenantId: string;
  tenant?: Tenant;
  name: string;
  description?: string;
  languages: string[];
  forms: FormSummary[];
};

export type Tenant = {
  id: string;
  name: string;
  projects?: Project[];
};

export type TenantRole = "TENANT_ADMIN" | "PROJECT_ADMIN" | "FORM_EDITOR" | "VIEWER";

export type TenantUser = {
  id: string;
  tenantId: string;
  email: string;
  subject?: string;
  role: TenantRole;
  createdAt: string;
};

export type FormSummary = {
  id: string;
  name: string;
  slug: string;
  status?: "ACTIVE" | "ARCHIVED";
  versions?: FormVersion[];
  publications?: { id: string; publicSlug: string; active: boolean }[];
};

export type FormVersion = {
  id: string;
  version: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  schema: Record<string, unknown>;
  translations: Record<string, unknown>;
};

export type Submission = {
  id: string;
  submittedAt: string;
  language: string;
  data: Record<string, unknown>;
  formVersion: { version: number };
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Deine Sitzung ist abgelaufen. Bitte melde dich erneut ueber den Login-Button an.");
    }
    if (response.status === 403) {
      throw new Error("Du hast keine Berechtigung für diese Aktion.");
    }
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}
