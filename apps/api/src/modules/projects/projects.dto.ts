import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ProjectRole } from "@prisma/client";

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ["de", "en"] })
  @IsArray()
  languages!: string[];
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  languages?: string[];
}

export class InviteProjectUserDto {
  @IsEmail()
  email!: string;

  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
