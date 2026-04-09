export function buildStMichael(){

  const steps:any[] = []

  /* =========================
   INÍCIO
  ========================= */

  steps.push({
    type:"prayer",
    title:"Sinal da Cruz",
    text:`Pelo sinal da Santa Cruz, livrai-nos, Deus, Nosso Senhor, dos nossos inimigos.
Em nome do Pai e do Filho e do Espírito Santo. Amém.`
  })

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
   TEXTO BASE DAS DEZENAS
  ========================= */

  const meditation = `São Miguel Arcanjo, Príncipe da Milícia Celeste,

tu que foste escolhido para vencer as forças do mal,
tu perante quem todo o inimigo recua,
vem ajudar-nos, vem proteger-nos.

Expulsa para longe tudo o que poderá dificultar
o nosso caminho na Fé e Santidade.

---

São Miguel Arcanjo,
defendei-nos no combate,
sede o nosso refúgio contra as maldades e ciladas do demônio.

Ordene-lhe Deus, instantemente o pedimos,
e vós, príncipe da milícia celeste,
pela virtude divina,
precipitai no inferno a satanás
e a todos os espíritos malignos,
que andam pelo mundo para perder as almas.

Amém.

---

Com a tua espada,
atravessa o flanco daquele que quer afastar-nos da nossa Mãe,
a Santíssima Virgem Maria,

e leva-nos sempre junto do nosso Pai Celeste,
lá, onde devemos morar como herdeiros do Reino.

Amém.`

  const decades = [
    "1ª dezena",
    "2ª dezena",
    "3ª dezena",
    "4ª dezena",
    "5ª dezena"
  ]

  /* =========================
   DEZENAS
  ========================= */

  for(let d=0; d<5; d++){

    steps.push({
      type:"mystery",
      title:decades[d],
      text:meditation
    })

    for(let i=0;i<10;i++){
      steps.push({
        type:"prayer",
        title:`São Miguel ${i+1}/10`,
        text:`São Miguel Arcanjo, Príncipe da Milícia Celeste, protege-nos, defende-nos, vem em nosso socorro.

Amém.`
      })
    }

  }

  /* =========================
   FINAL
  ========================= */

  steps.push({
    type:"prayer",
    title:"Oração Final",
    text:`São Miguel Arcanjo, contigo, pela graça de Deus Pai, nós queremos gritar no Céu: “Quem como Deus?!”

Ajuda-nos a escolhermos sempre o bem e afastar para longe de nós tudo o que é mal, tudo o que possa ferir o Coração de Deus.

Ajuda-nos a sermos dignos do nosso batismo, a fim de que no dia querido, possamos reinar junto do nosso Pai e rezar pelas almas que se afastam do Reino de Deus.

São Miguel Arcanjo, defendei-nos no combate, sede o nosso refúgio contra as maldades e ciladas do demônio. Ordene-lhe Deus, instantemente o pedimos, e vós, príncipe da milícia celeste, pela virtude divina, precipitai no inferno a satanás e a todos os espíritos malignos, que andam pelo mundo para perder as almas. Amém.

São Miguel Arcanjo, nós temos confiança em Ti, nós cremos em Todo o Poder que Deus te deu para salvar as almas e vencer as forças do mal.

Amém.`
  })

  return steps

}