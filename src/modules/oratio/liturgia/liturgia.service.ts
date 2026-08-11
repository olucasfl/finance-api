import { Injectable } from "@nestjs/common"
import axios from "axios"
import { buildMissa } from "./builders/missa.builder"

@Injectable()
export class LiturgiaService{

 async getToday(){

  const res = await axios.get(
   "https://liturgia.up.railway.app/v2/"
  )

  return res.data

 }

  async getByDate(dia: string, mes: string, ano: string) {

    const res = await axios.get(
        `https://liturgia.up.railway.app/v2/?dia=${dia}&mes=${mes}&ano=${ano}`
    )

    return res.data
  }

  async getFull(dia: string, mes: string, ano: string) {

    const data = await this.getByDate(dia, mes, ano)

    return buildMissa(data)
  }

}