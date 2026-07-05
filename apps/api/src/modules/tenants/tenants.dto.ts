import { TenantRole } from "@prisma/client";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpsertTenantUserDto {
  @IsEmail()
  email!: string;

  @IsEnum(TenantRole)
  role!: TenantRole;

  @IsOptional()
  @IsString()
  subject?: string;
}

export class UpdateTenantUserDto {
  @IsEnum(TenantRole)
  role!: TenantRole;
}
