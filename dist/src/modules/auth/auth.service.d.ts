import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { Response } from 'express';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly mailService;
    constructor(prisma: PrismaService, jwtService: JwtService, mailService: MailService);
    login(email: string, password: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    generateTokens(userId: string, email: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    refresh(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    verifyEmail(token: string, app: string, res: Response): Promise<void>;
    resendVerification(email: string, app?: string): Promise<{
        message: string;
    }>;
    checkVerification(email: string): Promise<{
        verified: boolean;
    }>;
    requestPasswordReset(email: string, app?: string): Promise<void>;
    resetPassword(token: string, password: string): Promise<void>;
}
