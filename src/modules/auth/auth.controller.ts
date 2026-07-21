import { Body, Controller, Post, Get, Query, Res, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from "express";
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) {}

  /*
  Login, forgot-password e resend-verification são as rotas mais
  visadas pra brute-force/spam — limite mais apertado que o resto
  do controller (10/min, definido no ThrottlerModule do AuthModule).
  */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
    refresh(@Body() body: RefreshTokenDto) {
      return this.authService.refresh(body.refresh_token);
    }

  @Get("verify-email")
  verifyEmail(@Query("token") token: string, @Query("app") app: string, @Res() res: Response) {
    return this.authService.verifyEmail(token, app, res);
  }

  /*
  Usado pelo frontend do Oratio: a página /verificar-email chama essa
  rota via fetch/axios depois de carregada, em vez de o link do email
  navegar direto pra cá. Isso evita que o pré-carregamento automático de
  link do Mail/Safari (que só segue navegação/GET de página, não dispara
  chamadas de API feitas por JS) consuma o token antes do clique real.
  */
  @Post('verify-email')
  confirmEmail(@Body() body: VerifyEmailDto) {
    return this.authService.confirmEmailToken(body.token);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('resend-verification')
  resendVerification(@Body() body: ResendVerificationDto, @Headers('x-app') app?: string) {
    return this.authService.resendVerification(body.email, app);
  }

  /*
  Sem limite: o frontend faz polling nessa rota a cada 3s enquanto
  espera a confirmação do email (ver VerifyEmailModal no Oratio),
  o que já passaria do limite padrão do controller.
  */
  @SkipThrottle()
  @Get("check-verification")
  checkVerification(@Query("email") email: string) {
    return this.authService.checkVerification(email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("forgot-password")
  forgotPassword(@Body() body: ForgotPasswordDto, @Headers('x-app') app?: string) {
    return this.authService.requestPasswordReset(body.email, app);
  }

  @Post("reset-password")
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  /*
  Confirmação de troca de email. Pública (o clique vem de um link de
  email, pode não ter sessão válida nesse navegador) — o frontend
  chama essa rota via fetch depois de carregar a página, nunca por
  navegação GET direta.
  */
  @Post('verify-email-change')
  confirmEmailChange(@Body() body: VerifyEmailDto) {
    return this.authService.confirmEmailChange(body.token);
  }

}