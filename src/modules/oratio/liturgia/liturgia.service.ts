import { Injectable } from "@nestjs/common"
import axios from "axios"

@Injectable()
export class LiturgiaService{

 async getToday(){

  const res = await axios.get(
   "https://liturgia.up.railway.app/v2/"
  )

  return res.data

 }

}