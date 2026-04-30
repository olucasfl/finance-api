export function buildTearsMary(){

 const steps:any[] = []

 /* =========================
 INÍCIO
 ========================= */

 steps.push({ type:"prayer", title:"Sinal da Santa Cruz" })

 steps.push({
  type:"prayer",
  title:"Oração Inicial",
  text:`Eis-nos aqui aos Vossos pés, ó dulcíssimo Jesus Crucificado, para Vos oferecermos as lágrimas d'Aquela que, com tanto amor, Vos acompanhou no caminho doloroso do Calvário.

Fazei, ó bom Mestre, que saibamos aproveitar da lição que elas nos dão, para que, na Terra, realizando a Vossa Santíssima vontade, possamos um dia, no Céu, Vos louvar por toda a eternidade. Amém.`
 })


 /* =========================
 7 DEZENAS
 ========================= */

 for(let d=1; d<=7; d++){

  steps.push({
   type:"prayer",
   title:`${d}ª Dezena`,
   text:`℣. Vêde, ó Jesus, que são as lágrimas d'Aquela que mais Vos amou na Terra.
℟. E que mais Vos ama no Céu.`
  })

  for(let i=0;i<7;i++){
   steps.push({
    type:"prayer",
    title:`Meu Jesus ${i+1}/7`,
    text:`℣. Meu Jesus, ouvi os nossos rogos.
℟. Pelas Lágrimas de Vossa Mãe Santíssima.`
   })
  }

 }


 /* =========================
 FINAL
 ========================= */

 // 3x repetição final
 for(let i=0;i<3;i++){
  steps.push({
   type:"prayer",
   title:`Vêde, ó Jesus ${i+1}/3`,
   text:`℣. Vêde, ó Jesus, que são as lágrimas d'Aquela que mais Vos amou na Terra.
℟. E que mais Vos ama no Céu.`
  })
 }

 steps.push({
  type:"prayer",
  title:"Oração Final",
  text:`Virgem Santíssima e Mãe das Dores, nós Vos pedimos que junteis os Vossos rogos aos nossos, a fim de que Jesus, Vosso Divino Filho, a quem nos dirigimos em nome das Vossas lágrimas de Mãe, ouça as nossas preces e nos conceda, com as graças que desejamos, a coroa da vida eterna.

Amém.`
 })

 steps.push({
  type:"prayer",
  title:"Jesus Manietado",
  text:`– Por Vossa mansidão divina, ó Jesus Manietado, salvai o mundo do erro que o ameaça!`
 })

 for(let i=0;i<2;i++){
    steps.push({
        type:"prayer",
        title:`Virgem Dolorosíssima ${i+1}/2`,
        text:`– Ó Virgem Dolorosíssima, as Vossas Lágrimas derrubaram o império infernal!`
    })
    }

 return steps

}