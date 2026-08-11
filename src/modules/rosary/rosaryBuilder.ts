import { ROSARY_MYSTERIES } from "./rosaryMysteries"

export function buildRosary(type:string){

 const mysteries = ROSARY_MYSTERIES[type]

 const steps:any[] = []

 /* início */

 steps.push({ type:"prayer", title:"Sinal da Santa Cruz" })

 steps.push({
  type: "prayer",
  title: "Oferecimento",
  text: "Divino Jesus, nós Vos oferecemos este terço que vamos rezar, meditando nos mistérios da nossa Redenção. Concedei-nos, por intercessão da Virgem Maria, Mãe de Deus e nossa Mãe, as virtudes que nos são necessárias para bem rezá-lo e a graça de ganharmos as indulgências desta santa devoção. Oferecemos particularmente, em desagravo dos pecados cometidos contra o Santíssimo Coração de Jesus e o Imaculado Coração de Maria, pela paz do mundo, pela conversão dos pecadores, pelas almas do Purgatório, pelas intenções do Santo Padre, pelo aumento e santificação do Clero, pelo nosso vigário, pela santificação das famílias, pelas missões, pelos doentes, pelos agonizantes, por todos aqueles que pediram nossas orações, pelo nosso país e por todas as nossas intenções particulares."
 })

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

 steps.push({
  type: "prayer",
  title: "Oração de Agradecimento",
  text: "Infinitas graças Vos damos, ó Soberana Rainha, pelos benefícios que todos os dias recebemos de vossas mãos liberais. Dignai-Vos, agora e para sempre, tomar-nos debaixo do vosso poderoso amparo. E, para mais Vos alegrar, Vos saudamos com uma Salve Rainha."
 })

 steps.push({ type:"prayer", title:"Salve Rainha" })

 return steps

}