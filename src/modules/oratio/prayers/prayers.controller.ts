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
import { AdminGuard } from 'src/modules/auth/admin.guard'
import { CreatePrayerCategoryDto } from './dto/create-prayer-category.dto'
import { CreatePrayerDto } from './dto/create-prayer.dto'

@Controller('oratio/prayers')
export class PrayersController {

 constructor(private readonly service:PrayersService){}

 /* =========================
    CATEGORIES
 ========================= */

 @Post("category")
 @UseGuards(JwtAuthGuard, AdminGuard)
 createCategory(@Body() body:CreatePrayerCategoryDto){
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
 @UseGuards(JwtAuthGuard, AdminGuard)
 createPrayer(@Body() body:CreatePrayerDto){
  return this.service.createPrayer(body)
 }

 @Get()
 getPrayers(@Query("category") slug:string){

  if(!slug){
   throw new BadRequestException("Category slug is required")
  }

  return this.service.getPrayersByCategory(slug)
 }

 // Precisa vir ANTES de ":id" — senão essa rota estática nunca é
 // alcançada, "history" seria capturado como se fosse um :id.
 @Get("history")
 @UseGuards(JwtAuthGuard)
 getHistory(@Req() req:any){
  return this.service.getHistory(req.user.userId)
 }

 @Get(":id")
 getPrayer(@Param("id") id:string){
  return this.service.getPrayer(id)
 }

 @Post("complete")
 @UseGuards(JwtAuthGuard)
 completePrayer(@Req() req:any, @Body() body:{ title?:string }){
  return this.service.completePrayer(req.user.userId, body?.title)
 }

}
