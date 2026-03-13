import { Controller, Post, Get, Req, UseGuards, Param } from "@nestjs/common"
import { RosaryService } from "./rosary.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"

@Controller("oratio/rosary")
export class RosaryController{

 constructor(private service:RosaryService){}

 /* SESSION */

 @Get("session")
 @UseGuards(JwtAuthGuard)
 session(@Req() req:any){
  return this.service.getSession(req.user.userId)
 }

 /* START */

 @Post("start")
 @UseGuards(JwtAuthGuard)
 start(@Req() req:any){
  return this.service.start(req.user.userId)
 }

 /* NEXT */

 @Post("next")
 @UseGuards(JwtAuthGuard)
 next(@Req() req:any){
  return this.service.nextStep(req.user.userId)
 }

 /* FINISH */

 @Post("finish")
 @UseGuards(JwtAuthGuard)
 finish(@Req() req:any){
  return this.service.finish(req.user.userId)
 }

 @Get(":type")
 getRosary(@Param("type") type:string){
  return this.service.getRosary(type)
 }

}