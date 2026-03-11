import { Injectable } from "@nestjs/common"

@Injectable()
export class VoxRateLimiter{

 private requests:Map<string,number[]> = new Map()

 check(userId:string){

  const now = Date.now()

  const window = 60 * 1000

  const limit = 5

  if(!this.requests.has(userId)){
   this.requests.set(userId,[])
  }

  const timestamps = this.requests.get(userId)!

  const filtered = timestamps.filter(t => now - t < window)

  if(filtered.length >= limit){

   return {
    allowed:false,
    message:
     "Você atingiu o limite de perguntas por minuto. Aguarde alguns instantes."
   }

  }

  filtered.push(now)

  this.requests.set(userId,filtered)

  return { allowed:true }

 }

}