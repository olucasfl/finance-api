import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
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

  /*
  Hash do refresh token pra guardar no banco. Propositalmente NÃO usa
  bcrypt aqui: bcrypt trunca a entrada em 72 bytes, e como todo refresh
  token do mesmo usuário começa com o mesmo prefixo (header fixo + sub +
  email, antes de iat/exp no payload do JWT), tokens *diferentes* do
  mesmo usuário podiam colidir no hash truncado — ou seja, um token já
  rotacionado continuava "válido" contra o hash de outro. Bcrypt é pra
  segredo de baixa entropia (senha); um JWT assinado já é de altíssima
  entropia, então um hash rápido (SHA-256) resolve certo, sem o limite
  de tamanho, e ainda permite lookup direto por hash em vez de comparar
  um por um contra cada sessão.
  */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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

  private readonly REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 180;

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

    /*
    Uma sessão nova por login/renovação, em vez de sobrescrever um
    campo único — assim logar num segundo aparelho não derruba a
    sessão persistente do primeiro.
    */
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(refresh_token),
        expiresAt: new Date(Date.now() + this.REFRESH_TTL_MS),
      },
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

    if (!user) {
      throw new UnauthorizedException();
    }

    const session = await this.prisma.refreshSession.findFirst({
      where: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    // Rotação: essa sessão específica é substituída por uma nova.
    // As sessões de outros dispositivos não são tocadas.
    await this.prisma.refreshSession.delete({
      where: { id: session.id },
    });

    return this.generateTokens(user.id, user.email);
  }

  /*
  Revoga a sessão do refresh token informado (best-effort — se o token
  já não bater com nenhuma sessão ativa, não há nada a fazer, e isso
  não deve impedir o logout do lado do cliente).
  */
  async logout(refreshToken: string) {

    let payload: any;

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      return;
    }

    await this.prisma.refreshSession.deleteMany({
      where: {
        userId: payload.sub,
        tokenHash: this.hashToken(refreshToken),
      },
    });

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

    if (app === "oratio") {
      return res.redirect("https://oratio-phi.vercel.app/login");
    }

    if (app === "cravou") {
      return res.redirect("https://cravou-ashy.vercel.app/login");
    }

    throw new BadRequestException("Unknown app");
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

    if (app !== AppType.ORATIO && app !== AppType.CRAVOU) {
      throw new BadRequestException('Unknown or missing app');
    }

    const emailSent = app === AppType.ORATIO
      ? await this.mailService.sendOratioVerificationEmail(user.email, token)
      : await this.mailService.sendCravouVerificationEmail(user.email, token);

    /*
    Diferente do forgot-password, essa rota já não é "genérica não
    importa o quê" — a essa altura já sabemos que a conta existe e não
    está verificada (branches acima), então não tem segredo de
    existência sendo protegido aqui. Faz sentido avisar de verdade se
    o envio falhou, em vez de mentir "reenviado com sucesso".
    */
    if (!emailSent) {
      throw new ServiceUnavailableException(
        'Failed to send verification email. Please try again in a moment.',
      );
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

  /*
  Silencioso nos dois casos (email não existe OU app não reconhecido) —
  de propósito, pra não dar nenhum sinal que deixe alguém descobrir se
  um email existe na base testando variações do header x-app.
  */
  if (!user) return;
  if (app !== AppType.ORATIO && app !== AppType.CRAVOU) return;

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

  } else {

    await this.mailService.sendCravouPasswordResetEmail(user.email, token);

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