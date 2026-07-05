import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";

type TenantUserInvitation = {
  email: string;
  role: string;
  tenantName: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(config: ConfigService) {
    this.from = config.get<string>("SMTP_FROM") ?? "no-reply@formularservice.local";
    this.appUrl = config.get<string>("PUBLIC_APP_URL") ?? "http://localhost:5173";
    this.transporter = createTransport({
      host: config.get<string>("SMTP_HOST") ?? "localhost",
      port: Number(config.get<string>("SMTP_PORT") ?? 1025),
      secure: false
    });
  }

  async sendTenantUserInvitation(invitation: TenantUserInvitation) {
    const subject = `Einladung zum Formularservice: ${invitation.tenantName}`;
    const text = [
      `Du wurdest zum Mandanten "${invitation.tenantName}" eingeladen.`,
      "",
      `Rolle: ${invitation.role}`,
      "",
      "Melde dich mit deinem OIDC-/Keycloak-Benutzer im Formularservice an:",
      this.appUrl,
      "",
      "Falls du noch keinen Login hast, muss ein Administrator deinen Benutzer im OIDC Provider anlegen."
    ].join("\n");

    await this.transporter.sendMail({
      from: this.from,
      to: invitation.email,
      subject,
      text,
      html: `
        <p>Du wurdest zum Mandanten <strong>${escapeHtml(invitation.tenantName)}</strong> eingeladen.</p>
        <p><strong>Rolle:</strong> ${escapeHtml(invitation.role)}</p>
        <p><a href="${escapeHtml(this.appUrl)}">Zum Formularservice</a></p>
        <p>Falls du noch keinen Login hast, muss ein Administrator deinen Benutzer im OIDC Provider anlegen.</p>
      `
    });

    this.logger.log(`Tenant invitation sent to ${invitation.email} for ${invitation.tenantName}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
