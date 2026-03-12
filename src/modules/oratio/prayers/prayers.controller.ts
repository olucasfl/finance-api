import {
 Controller,
 Get,
 Post,
 Body,
 Param,
 Query,
 UseGuards,
 Req,
 BadRequestException
} from '@nestjs/common'

import { PrayersService } from './prayers.service'
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard'

@Controller('oratio/prayers')
export class PrayersController {

 constructor(private readonly service:PrayersService){}

 /* =========================
    CATEGORIES
 ========================= */

 @Post("category")
 @UseGuards(JwtAuthGuard)
 createCategory(@Body() body:any){
  return this.service.createCategory(body)
 }

 @Get("categories")
 getCategories(){
  return this.service.getCategories()
 }

 /* =========================
    PRAYERS
 ========================= */

 @Post()
 @UseGuards(JwtAuthGuard)
 createPrayer(@Body() body:any){
  return this.service.createPrayer(body)
 }

 @Get()
 getPrayers(@Query("category") slug:string){

  if(!slug){
   throw new BadRequestException("Category slug is required")
  }

  return this.service.getPrayersByCategory(slug)
 }

 @Get(":id")
 getPrayer(@Param("id") id:string){
  return this.service.getPrayer(id)
 }

 @Post("complete")
 @UseGuards(JwtAuthGuard)
 completePrayer(@Req() req:any){
  return this.service.completePrayer(req.user.userId)
 }

}