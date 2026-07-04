import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateFormDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsObject()
  schema!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;
}

export class UpdateDraftDto {
  @IsObject()
  schema!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;
}

export class UpdateFormDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class SubmitFormDto {
  @IsObject()
  data!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  invitationToken?: string;
}
