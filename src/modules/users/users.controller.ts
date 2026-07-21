import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Req,
  UseGuards,
  Headers,
  UnauthorizedException,
  Param,
  Query,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from 'src/cravou/admin/admin.guard';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@Controller('users')
export class UsersController {

  constructor(private readonly userService: UsersService) {}

  /*
  =============================
  CREATE USER
  =============================
  */

  @Post()
  create(@Body() body: CreateUserDto, @Headers('x-app') app?: string) {
    return this.userService.create(body, app);
  }

  /*
  =============================
  GET PROFILE
  =============================
  */

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {

    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.getProfile(userId);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAllUsers(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('isAdmin') isAdmin?: string,
    @Query('emailVerified') emailVerified?: string,
    @Query('activeLastDays') activeLastDays?: string,
  ) {
    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const filters = {
      search: search || undefined,
      isAdmin: isAdmin === 'true' ? true : isAdmin === 'false' ? false : undefined,
      emailVerified: emailVerified === 'true' ? true : emailVerified === 'false' ? false : undefined,
      activeLastDays: activeLastDays ? parseInt(activeLastDays) : undefined,
    };

    return this.userService.getAllUsers(userId, filters);
  }

  @Get('admin/users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getUserDetail(@Req() req: any, @Param('id') userId: string) {
    const adminId = req?.user?.userId;

    if (!adminId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.getUserDetail(adminId, userId);
  }

  @Delete('admin/users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  deleteUser(@Req() req: any, @Param('id') userId: string) {
    const adminId = req?.user?.userId;

    if (!adminId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.deleteUserAdmin(adminId, userId);
  }


  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAdminStats(@Req() req: any) {
    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.getAdminStats(userId);
  }

  @Patch('admin/users/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  setAdminStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { isAdmin: boolean; adminPassword: string },
  ) {
    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.setAdminStatus(
      userId,
      id,
      body.isAdmin,
      body.adminPassword
    );
  }

  @Get('admin/users/:id/activity')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getUserActivity(@Req() req: any, @Param('id') userId: string) {
    const adminId = req?.user?.userId;

    if (!adminId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.getUserActivity(adminId, userId);
  }

  /*
  =============================
  UPDATE PROFILE
  =============================
  */

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: any,
    @Body() body: { name: string },
  ) {

    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.updateProfile(
      userId,
      body.name,
    );
  }

  /*
  =============================
  CHANGE PASSWORD
  =============================
  */

  /*
  Rate limit: sem isso, alguém com um access token válido (roubado ou
  de sessão comprometida) podia tentar `currentPassword` infinitas
  vezes até acertar por força bruta.
  */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Post('me/change-password')
  changePassword(
    @Req() req: any,
    @Body() body: ChangePasswordDto,
  ) {

    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  /*
  =============================
  CHANGE EMAIL (2 passos)
  =============================
  */

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Post('me/email')
  requestEmailChange(
    @Req() req: any,
    @Body() body: ChangeEmailDto,
    @Headers('x-app') app?: string,
  ) {

    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.requestEmailChange(userId, body.email, app);
  }

  @Post('me/email/cancel')
  @UseGuards(JwtAuthGuard)
  cancelEmailChange(@Req() req: any) {

    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.cancelEmailChange(userId);
  }

  /*
  =============================
  DELETE ACCOUNT
  =============================
  */

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteAccount(@Req() req: any) {

    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.deleteAccount(userId);
  }

}