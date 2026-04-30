import { ROSARY_MYSTERIES } from "./rosaryMysteries"

export function buildRosary(type:string){

 const mysteries = ROSARY_MYSTERIES[type]

 const steps:any[] = []

 /* início */

 steps.push({ type:"prayer", title:"Sinal da Santa Cruz" })

 steps.push({ type:"prayer", title:"Credo" })

 steps.push({ type:"prayer", title:"Pai Nosso" })

 for(let i=0;i<3;i++){
  steps.push({ type:"prayer", title:"Ave Maria" })
 }

 steps.push({ type:"prayer", title:"Glória ao Pai" })

 steps.push({ type:"prayer", title:"Jaculatória de Fátima" })

 /* dezenas */

 mysteries.forEach((mystery,index)=>{

  steps.push({
    type: "mystery",
    title: `${index+1}º Mistério - ${mystery.title}`,
    text: mystery.meditation
  })

  steps.push({ type:"prayer", title:"Pai Nosso" })

  for(let i=0;i<10;i++){
   steps.push({
    type:"prayer",
    title:`Ave Maria ${i+1}/10`
   })
  }

  steps.push({ type:"prayer", title:"Glória ao Pai" })

 steps.push({ type:"prayer", title:"Jaculatória de Fátima" })

 })

 /* final */

 steps.push({ type:"prayer", title:"Salve Rainha" })

 return steps

}