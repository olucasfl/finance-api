import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import { AllExceptionsFilter } from './system-log/all-exceptions.filter'
import { SystemLogService } from './system-log/system-log.service'

async function bootstrap() {

 const app = await NestFactory.create(AppModule)

 /* =========================
    OBSERVABILIDADE MÍNIMA
    (registra erros 5xx num buffer em memória pro painel admin —
    ver src/system-log)
 ========================= */

 app.useGlobalFilters(new AllExceptionsFilter(app.get(SystemLogService)))

 /* =========================
    HEADERS DE SEGURANÇA
    (API pura JSON, sem CSP para não afetar o redirect de verify-email)
 ========================= */

 app.use(
  helmet({
   contentSecurityPolicy: false,
  })
 )

 /* =========================
    CORS GLOBAL
 ========================= */

app.enableCors({
  origin: "*",
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-App"
  ],
  exposedHeaders: ["Authorization"]
})

 /* =========================
    VALIDAÇÃO GLOBAL
 ========================= */

 app.useGlobalPipes(
  new ValidationPipe({
   whitelist: true,
   forbidNonWhitelisted: true,
   transform: true
  })
 )

 /* =========================
    START SERVER
 ========================= */

 const port = process.env.PORT ?? 3000

 await app.listen(port)

 console.log(`🚀 Oratio API rodando na porta ${port}`)

}

bootstrap()