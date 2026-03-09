import { Body, Controller, Post, Get, Query, Res, Headers } from '@nestjs/common';
import type { Response } from "express";
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  refresh(@Body() body: { refresh_token: string }) {

    const decoded: any = this.authService['jwtService'].decode(body.refresh_token);

    return this.authService.refresh(decoded.sub, body.refresh_token);

  }

  @Get("verify-email")
  verifyEmail(@Query("token") token: string, @Res() res: Response) {
    return this.authService.verifyEmail(token, res);
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