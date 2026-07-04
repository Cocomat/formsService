import { IsEmail, IsInt, IsOptional, Min } from "class-validator";

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}
