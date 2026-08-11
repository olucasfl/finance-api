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

   // a mais antiga das timestamps dentro da janela é a próxima a expirar
   const oldest = filtered[0]
   const retryAfterSeconds = Math.max(1, Math.ceil((oldest + window - now) / 1000))

   return {
    allowed:false,
    retryAfterSeconds,
    message:
     `Você atingiu o limite de perguntas por minuto. Tente de novo em ${retryAfterSeconds} segundo${retryAfterSeconds === 1 ? "" : "s"}.`
   }

  }

  filtered.push(now)

  this.requests.set(userId,filtered)

  return { allowed:true }

 }

}