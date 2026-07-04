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
