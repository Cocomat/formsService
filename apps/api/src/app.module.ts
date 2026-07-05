import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { FormsModule } from "./modules/forms/forms.module";
import { HealthController } from "./modules/health/health.controller";
import { InvitationsModule } from "./modules/invitations/invitations.module";
import { MailModule } from "./modules/mail/mail.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { SubmissionsModule } from "./modules/submissions/submissions.module";
import { TenantsModule } from "./modules/tenants/tenants.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuditModule,
    ProjectsModule,
    FormsModule,
    InvitationsModule,
    MailModule,
    SubmissionsModule,
    ApiKeysModule,
    TenantsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
