import { Controller,Get, Query } from "@nestjs/common"
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

 @Get("/full")
 getFull(
    @Query("dia") dia: string,
    @Query("mes") mes: string,
    @Query("ano") ano: string
    ) {
    return this.liturgiaService.getFull(dia, mes, ano)
    }

}