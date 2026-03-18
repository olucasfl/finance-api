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