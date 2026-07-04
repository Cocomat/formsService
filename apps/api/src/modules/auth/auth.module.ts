import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { RolesGuard } from "./roles.guard";

@Global()
@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: "jwt" })],
  providers: [JwtStrategy, RolesGuard],
  exports: [JwtStrategy, RolesGuard, PassportModule]
})
export class AuthModule {}
