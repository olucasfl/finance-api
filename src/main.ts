import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {

 const app = await NestFactory.create(AppModule)

 app.enableCors({
  origin: [
   "http://localhost:5173",
   "https://oratio.vercel.app"
  ],
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
 })

 /* IMPORTANTE PARA VERCEL */

 app.use((req, res, next) => {

  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
   return res.sendStatus(200)
  }

  next()

 })

 app.useGlobalPipes(
  new ValidationPipe({
   whitelist: true,
   forbidNonWhitelisted: true,
   transform: true
  })
 )

 await app.listen(process.env.PORT ?? 3000)

}

bootstrap()