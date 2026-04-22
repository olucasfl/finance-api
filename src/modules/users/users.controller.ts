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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  getUserDetail(@Req() req: any, @Param('id') userId: string) {
    const adminId = req?.user?.userId;

    if (!adminId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.getUserDetail(adminId, userId);
  }

  @Delete('admin/users/:id')
  @UseGuards(JwtAuthGuard)
  deleteUser(@Req() req: any, @Param('id') userId: string) {
    const adminId = req?.user?.userId;

    if (!adminId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.deleteUserAdmin(adminId, userId);
  }


  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  getAdminStats(@Req() req: any) {
    const userId = req?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return this.userService.getAdminStats(userId);
  }

  @Patch('admin/users/:id')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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