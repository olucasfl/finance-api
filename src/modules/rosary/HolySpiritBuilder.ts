export function buildHolySpirit(){

 const steps:any[] = []

 /* =========================
 INÍCIO
 ========================= */

 steps.push({ type:"prayer", title:"Sinal da Santa Cruz" })

 steps.push({ type:"prayer", title:"Credo" })

 steps.push({ type:"prayer", title:"Pai Nosso" })

 for(let i=0;i<3;i++){
  steps.push({
   type:"prayer",
   title:`Ave Maria ${i+1}/3`
  })
 }

 steps.push({ type:"prayer", title:"Glória ao Pai" })


 /* =========================
 DEZENAS (5)
 ========================= */

 for(let d=1; d<=5; d++){

  steps.push({
   type:"prayer",
   title:`${d}ª Dezena`,
   text:`Recebereis a força do Espírito Santo e sereis minhas testemunhas.`
  })

  for(let i=0;i<10;i++){
   steps.push({
    type:"prayer",
    title:`Vinde Espírito Santo ${i+1}/10`,
    text:`Vinde Espírito Santo`
   })
  }

  steps.push({ type:"prayer", title:"Glória ao Pai" })

 }


 /* =========================
 FINAL
 ========================= */

 steps.push({
  type:"prayer",
  title:"Oração ao Espírito Santo",
  text:`Vinde Espírito Santo, enchei os corações dos vossos fiéis e acendei neles o fogo do vosso amor.
Enviai o vosso Espírito e tudo será criado. E renovareis a face da terra.

OREMOS:
Ó Deus, que instruístes os corações dos vossos fiéis com a luz do Espírito Santo, fazei que apreciemos retamente todas as coisas segundo o mesmo Espírito e gozemos sempre da sua consolação. Por Cristo, Senhor Nosso.

Amém.`
 })

 return steps

}