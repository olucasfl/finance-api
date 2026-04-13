import { Body, Controller, Post, Get, Query, Res, Headers, UnauthorizedException } from '@nestjs/common';
import type { Response } from "express";
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  refresh(@Body() body: { refresh_token: string }) {

    try {

      const decoded = this.jwtService.verify(body.refresh_token);

      return this.authService.refresh(decoded.sub, body.refresh_token);

    } catch (err) {

      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  @Get("verify-email")
  verifyEmail(@Query("token") token: string, @Query("app") app: string, @Res() res: Response) {
    return this.authService.verifyEmail(token, app, res);
  }

  @Post('resend-verification')
  resendVerification(@Body() body: { email: string }, @Headers('x-app') app?: string) {
    return this.authService.resendVerification(body.email, app);
  }

  @Get("check-verification")
  checkVerification(@Query("email") email: string) {
    return this.authService.checkVerification(email);
  }

  @Post("forgot-password")
  forgotPassword(@Body() body: { email: string }, @Headers('x-app') app?: string) {
    return this.authService.requestPasswordReset(body.email, app);
  }

  @Post("reset-password")
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

}