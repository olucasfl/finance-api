import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Req,
  UseGuards,
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
  create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  /*
  =============================
  GET PROFILE
  =============================
  */

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {

    return this.userService.getProfile(req.user.sub);
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

    return this.userService.updateProfile(
      req.user.sub,
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

    return this.userService.deleteAccount(req.user.sub);
  }

}