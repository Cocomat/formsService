import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SubmitFormDto } from "./forms.dto";
import { FormsService } from "./forms.service";

@ApiTags("public-forms")
@Controller("public/forms")
export class PublicFormsController {
  constructor(private readonly forms: FormsService) {}

  @Get(":publicSlug")
  get(@Param("publicSlug") publicSlug: string) {
    return this.forms.getPublished(publicSlug);
  }

  @Post(":publicSlug/submissions")
  submit(@Param("publicSlug") publicSlug: string, @Body() dto: SubmitFormDto) {
    return this.forms.submit(publicSlug, dto);
  }
}
