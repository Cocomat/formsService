import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get("PUBLIC_APP_URL") ?? "http://localhost:5173",
    credentials: true
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  const openapi = new DocumentBuilder()
    .setTitle("FormularService V1 API")
    .setDescription("Projekt-, Formular-, Publikations- und Einreichungs-API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .addApiKey({ type: "apiKey", name: "x-api-key", in: "header" }, "project-api-key")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, openapi));

  await app.listen(config.get("API_PORT") ?? config.get("PORT") ?? 3000);
}

void bootstrap();
