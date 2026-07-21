import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { Response } from 'express';
import { AppType } from 'src/enums/app-type.enum';

@Injectable()
export class AuthService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  /*
  Secret exclusivo do refresh token — diferente do JWT_SECRET_KEY usado
  pelo access token. Assim, um refresh token vazado não pode ser usado
  como Bearer em rotas protegidas (a assinatura simplesmente não bate
  com o secret que o JwtStrategy usa pra validar access tokens).
  */
  private getRefreshSecret(): string {

    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET não configurada no ambiente');
    }

    return secret;

  }

  async login(email: string, password: string) {

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    return this.generateTokens(user.id, user.email);

  }

  async generateTokens(userId: string, email: string) {

    const payload = { sub: userId, email };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refresh_token = this.jwtService.sign(payload, {
      /*
      Longo de propósito: o Oratio funciona como um app, não como uma
      sessão de site — a pessoa não deve precisar logar de novo toda hora.
      Como o refresh token rotaciona a cada uso (um novo é emitido em toda
      renovação), na prática quem abre o app pelo menos 1x nesse período
      nunca vê tela de login de novo.
      */
      expiresIn: '180d',
      secret: this.getRefreshSecret(),
    });

    const hashedRefresh = await bcrypt.hash(refresh_token, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefresh },
    });

    return {
      access_token,
      refresh_token,
    };

  }

  async refresh(refreshToken: string) {

    let payload: any;

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException();
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!matches) {
      throw new UnauthorizedException();
    }

    return this.generateTokens(user.id, user.email);
  }

  /*
  Núcleo idempotente da confirmação de email, usado tanto pelo endpoint
  legado (GET, redirect) quanto pelo novo endpoint (POST, JSON) chamado
  via fetch pelo frontend.

  O token NÃO é limpo ao confirmar com sucesso. Isso é proposital: links de
  verificação em email são frequentemente pré-carregados automaticamente
  (proteção de privacidade do Mail/Safari no iOS, scanners antiphishing)
  antes do clique real do usuário. Se o token fosse zerado nessa primeira
  requisição "fantasma", o clique real do usuário cairia em 401 por não
  achar mais o token. Mantendo o token e checando `emailVerified` antes de
  tudo, uma segunda (ou terceira) confirmação do mesmo token é inofensiva
  e sempre responde sucesso.
  */
  async confirmEmailToken(token: string) {

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid verification token");
    }

    if (user.emailVerified) {
      return { alreadyVerified: true };
    }

    if (
      user.emailVerificationTokenExpires &&
      user.emailVerificationTokenExpires < new Date()
    ) {
      throw new UnauthorizedException("Verification token expired");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
      },
    });

    return { alreadyVerified: false };

  }

  async verifyEmail(token: string, app: string, res: Response) {

    await this.confirmEmailToken(token);

    let redirectUrl = "https://finance-api-front.vercel.app/login";

    if (app === "oratio") {
      redirectUrl = "https://oratio-phi.vercel.app/login";
    } else if (app === "smart-finance") {
      redirectUrl = "https://finance-api-front.vercel.app/login";
    } else if (app === "cravou") {
      redirectUrl = "https://cravou-ashy.vercel.app/login";
    }

    return res.redirect(redirectUrl);
  }

  /*
  Confirmação de troca de email — mesmo desenho idempotente do
  confirmEmailToken (token não é limpo no sucesso, checagem de "já
  aplicado" via comparação de estado). O link é enviado só pro
  frontend (nunca direto pra API), então não corre o mesmo risco de
  link prefetching que a verificação original tinha.
  */
  async confirmEmailChange(token: string) {

    const user = await this.prisma.user.findFirst({
      where: { pendingEmailToken: token },
    });

    if (!user || !user.pendingEmail) {
      throw new UnauthorizedException('Invalid confirmation token');
    }

    if (user.email === user.pendingEmail) {
      return { alreadyConfirmed: true, email: user.email };
    }

    if (user.pendingEmailExpires && user.pendingEmailExpires < new Date()) {
      throw new UnauthorizedException('Confirmation link expired');
    }

    const taken = await this.prisma.user.findFirst({
      where: { email: user.pendingEmail, id: { not: user.id } },
    });

    if (taken) {
      throw new ConflictException('This email is no longer available');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { email: user.pendingEmail },
    });

    return { alreadyConfirmed: false, email: user.pendingEmail };

  }

  async resendVerification(email: string, app?: string) {

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return { message: 'If this email exists, a verification email was sent.' };
    }

    if (user.emailVerified) {
      return { message: 'Email already verified.' };
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationTokenExpires: expires,
      },
    });

    if (app === AppType.ORATIO) {

      await this.mailService.sendOratioVerificationEmail(user.email, token);

    } else if (app === AppType.CRAVOU) {

      await this.mailService.sendCravouVerificationEmail(user.email, token);

    } else {

      await this.mailService.sendVerificationEmail(user.email, token);

    }

    return {
      message: 'Verification email resent successfully',
    };

  }

  async checkVerification(email: string) {

  const user = await this.prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  return {
    verified: user?.emailVerified || false
  };

}

async requestPasswordReset(email: string, app?: string) {

  const user = await this.prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) return;

  const token = randomBytes(32).toString("hex");

  const expires = new Date(Date.now() + 1000 * 60 * 30);

  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expires
    }
  });

  if (app === AppType.ORATIO) {

    await this.mailService.sendOratioPasswordResetEmail(user.email, token);

  } else if (app === AppType.CRAVOU) {

    await this.mailService.sendCravouPasswordResetEmail(user.email, token);

  } else {

    await this.mailService.sendPasswordResetEmail(user.email, token);

  }

}

async resetPassword(token: string, password: string) {

  const user = await this.prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new UnauthorizedException("Invalid or expired token");
  }

  const hashed = await bcrypt.hash(password, 10);

  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      passwordResetToken: null,
      passwordResetExpires: null
    }
  });

}

}