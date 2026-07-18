import { Controller,Get, Query } from "@nestjs/common"
import { LiturgiaService } from "./liturgia.service"

@Controller("liturgia")
export class LiturgiaController{

 constructor(
  private readonly liturgiaService:LiturgiaService
 ){}

 @Get()
 getToday(
  @Query("dia") dia?: string,
  @Query("mes") mes?: string,
  @Query("ano") ano?: string
 ){

  if(dia && mes && ano){
   return this.liturgiaService.getByDate(dia, mes, ano)
  }

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