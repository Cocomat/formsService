export type AuthUser = {
  subject: string;
  email?: string;
  roles: string[];
};

export type AuthRequest = Request & {
  user?: AuthUser;
  projectApiKey?: {
    projectId: string;
    apiKeyId: string;
  };
};

export function auditActor(user?: AuthUser) {
  return user?.email ?? user?.subject;
}
