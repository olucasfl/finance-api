import { Body, Controller, Post, Get, Query, Res, Headers, UnauthorizedException } from '@nestjs/common';
import type { Response } from "express";
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService
  ) {}

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

  @Post('resend-verification')
  resendVerification(@Body() body: ResendVerificationDto, @Headers('x-app') app?: string) {
    return this.authService.resendVerification(body.email, app);
  }

  @Get("check-verification")
  checkVerification(@Query("email") email: string) {
    return this.authService.checkVerification(email);
  }

  @Post("forgot-password")
  forgotPassword(@Body() body: ForgotPasswordDto, @Headers('x-app') app?: string) {
    return this.authService.requestPasswordReset(body.email, app);
  }

  @Post("reset-password")
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

}