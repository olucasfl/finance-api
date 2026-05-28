import { Injectable, UnauthorizedException } from '@nestjs/common';
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

  async login(email: string, password: string) {

    const user = await this.prisma.user.findUnique({
      where: { email },
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
      expiresIn: '30d',
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
      payload = this.jwtService.verify(refreshToken);
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

  async verifyEmail(token: string, app: string, res: Response) {

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid verification token");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

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

  async resendVerification(email: string, app?: string) {

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'If this email exists, a verification email was sent.' };
    }

    if (user.emailVerified) {
      return { message: 'Email already verified.' };
    }

    const token = randomBytes(32).toString('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
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
    where: { email },
  });

  return {
    verified: user?.emailVerified || false
  };

}

async requestPasswordReset(email: string, app?: string) {

  const user = await this.prisma.user.findUnique({
    where: { email },
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