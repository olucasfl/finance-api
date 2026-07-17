import { Controller, Post, Get, Req, UseGuards, Param, Body, Query } from "@nestjs/common"
import { RosaryService } from "./rosary.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"

@Controller("oratio/rosary")
export class RosaryController{

 constructor(private service:RosaryService){}

 /* SESSION */

 @Get("session")
 @UseGuards(JwtAuthGuard)
 session(@Req() req:any, @Query("type") type:string){
  return this.service.getSession(req.user.userId, type)
 }

 /* ACTIVE PROGRESS */

 @Get("progress")
 @UseGuards(JwtAuthGuard)
 progress(@Req() req:any){
  return this.service.getActiveProgress(req.user.userId)
 }

 /* HISTORY */

 @Get("history")
 @UseGuards(JwtAuthGuard)
 history(@Req() req:any){
  return this.service.getHistory(req.user.userId)
 }

 /* START */

 @Post("start")
 @UseGuards(JwtAuthGuard)
 start(@Req() req:any, @Body() body:{ type:string, restart?:boolean }){
  return this.service.start(req.user.userId, body.type, body.restart)
 }

 /* STEP */

 @Post("step")
 @UseGuards(JwtAuthGuard)
 step(@Req() req:any, @Body() body:{ type:string, step:number }){
  return this.service.updateStep(req.user.userId, body.type, body.step)
 }

 /* FINISH */

 @Post("finish")
 @UseGuards(JwtAuthGuard)
 finish(@Req() req:any, @Body() body:{ type:string }){
  return this.service.finish(req.user.userId, body.type)
 }

 @Get(":type")
 getRosary(@Param("type") type:string){
  return this.service.getRosary(type)
 }

}
