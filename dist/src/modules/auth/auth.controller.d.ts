import type { Response } from "express";
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthController {
    private readonly authService;
    private readonly jwtService;
    constructor(authService: AuthService, jwtService: JwtService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    refresh(refreshToken: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    verifyEmail(token: string, app: string, res: Response): Promise<void>;
    resendVerification(body: {
        email: string;
    }, app?: string): Promise<{
        message: string;
    }>;
    checkVerification(email: string): Promise<{
        verified: boolean;
    }>;
    forgotPassword(body: {
        email: string;
    }, app?: string): Promise<void>;
    resetPassword(body: {
        token: string;
        password: string;
    }): Promise<void>;
}
