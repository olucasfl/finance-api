import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import { AllExceptionsFilter } from './system-log/all-exceptions.filter'
import { SystemLogService } from './system-log/system-log.service'

async function bootstrap() {

 const app = await NestFactory.create(AppModule)

 /* =========================
    TRUST PROXY
    (API roda atrás de um proxy reverso — Render. Sem isso, req.ip do
    Express resolve pro IP do proxy, não do cliente real: o rate limit
    de login/reset (ThrottlerGuard, que usa req.ip por padrão) passaria
    a valer pra TODOS os usuários somados em vez de por pessoa, podendo
    travar login geral com poucas tentativas de qualquer um. "1" confia
    só no primeiro hop à frente da aplicação — o balanceador do Render —
    e não em qualquer X-Forwarded-For que um cliente tente forjar.)
 ========================= */

 app.getHttpAdapter().getInstance().set('trust proxy', 1)

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
    (allowlist em vez de "*": a API só usa Bearer token, não cookie, então
    CORS aberto não habilita CSRF clássico — mas ainda deixa qualquer site
    disparar login/registro/forgot-password roteirizado a partir do
    navegador de um visitante. ALLOWED_ORIGINS (env, separado por vírgula)
    permite adicionar origem sem alterar código; os defaults cobrem a
    produção atual e o Vite dev server.)
 ========================= */

const defaultOrigins = [
  "https://oratio-phi.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : defaultOrigins

app.enableCors({
  origin: allowedOrigins,
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