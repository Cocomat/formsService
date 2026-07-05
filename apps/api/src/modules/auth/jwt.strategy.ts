import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { passportJwtSecret } from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";

type JwtPayload = {
  sub: string;
  email?: string;
  realm_access?: { roles?: string[] };
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const issuer = config.get<string>("OIDC_ISSUER_URL") ?? "http://127.0.0.1:8080/realms/formularservice";
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: config.get<string>("OIDC_AUDIENCE") ?? "formularservice-api",
      issuer,
      algorithms: ["RS256"],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`
      })
    });
  }

  validate(payload: JwtPayload) {
    return {
      subject: payload.sub,
      email: payload.email,
      roles: payload.realm_access?.roles ?? []
    };
  }
}
