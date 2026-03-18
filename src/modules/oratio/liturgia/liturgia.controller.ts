import { Controller,Get } from "@nestjs/common"
import { LiturgiaService } from "./liturgia.service"

@Controller("liturgia")
export class LiturgiaController{

 constructor(
  private readonly liturgiaService:LiturgiaService
 ){}

 @Get()
 getToday(){

  return this.liturgiaService.getToday()

 }

}