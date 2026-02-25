import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly userService: UsersService) {}

    @Post()
    create(@Body() body: CreateUserDto) {
        return this.userService.create(body);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getProfile(@Req() req: any) {
        return req.user;
    }
}
