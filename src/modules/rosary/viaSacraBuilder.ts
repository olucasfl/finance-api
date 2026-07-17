export function buildViaSacra(){

  const steps:any[] = []

  /* =========================
   INÍCIO
  ========================= */

  steps.push({
    type:"prayer",
    title:"Sinal da Santa Cruz"
  })

  steps.push({
    type:"prayer",
    title:"Oração Inicial",
    text:`Meu Jesus, eu quero acompanhar-Vos neste caminho doloroso que percorrestes carregado com a cruz até o Calvário.

Dai-me um coração compassivo, capaz de sofrer convosco, e alcançai-me o arrependimento verdadeiro dos meus pecados, que foram a causa da vossa Paixão.

Convosco quero morrer para o pecado e ressuscitar para uma vida nova.`
  })

  /* =========================
   ESTAÇÕES
  ========================= */

  const versiculo = `Nós Vos adoramos, ó Cristo, e Vos bendizemos.
Porque, pela Vossa Santa Cruz, remistes o mundo.`

  const estacoes = [

    {
      title:"1ª Estação – Jesus é condenado à morte",
      text:`Pilatos, vendo que nada conseguia, mas que pelo contrário aumentava a confusão, tomou água e lavou as mãos diante do povo, dizendo: Sou inocente do sangue deste justo; seja isso conta vossa (Mt 27,24). E entregou Jesus para ser crucificado.

Meditemos: Jesus, condenado injustamente por temor e covardia, ensina-nos a ter coragem para defender a verdade, mesmo quando isso for difícil.`
    },

    {
      title:"2ª Estação – Jesus é carregado com a cruz",
      text:`Tomaram, pois, os soldados a Jesus. E, levando ele mesmo a sua cruz, saiu para o lugar chamado Calvário, em hebraico Gólgota (Jo 19,16-17).

Meditemos: Jesus abraça a cruz com amor, para nos ensinar a carregar com fé as cruzes que a vida nos apresenta.`
    },

    {
      title:"3ª Estação – Jesus cai pela primeira vez",
      text:`Ele foi transpassado por causa das nossas transgressões, esmagado por causa das nossas iniquidades. Como um cordeiro que é levado ao matadouro, ele não abriu a sua boca (Is 53,5.7).

Meditemos: Exausto pelo peso da cruz e dos nossos pecados, Jesus cai. Ensina-nos a levantar sempre, confiando em sua misericórdia.`
    },

    {
      title:"4ª Estação – Jesus encontra sua Mãe",
      text:`Simeão os abençoou e disse a Maria, sua mãe: Uma espada trespassará a tua própria alma (Lc 2,34-35). No caminho do Calvário, essa profecia se cumpre no encontro doloroso entre Mãe e Filho.

Meditemos: Maria acompanha Jesus até o fim, unida à sua dor. Que saibamos permanecer fiéis, mesmo nos momentos mais difíceis.`
    },

    {
      title:"5ª Estação – Simão Cireneu ajuda Jesus a carregar a cruz",
      text:`Ao saírem, encontraram um homem cireneu, chamado Simão, e obrigaram-no a carregar a cruz de Jesus (Mt 27,32).

Meditemos: Simão ajuda Jesus, mesmo sem entender plenamente. Que estejamos sempre dispostos a ajudar quem sofre ao nosso lado.`
    },

    {
      title:"6ª Estação – Verônica enxuga o rosto de Jesus",
      text:`Segundo a tradição, uma mulher chamada Verônica, movida de compaixão, abriu caminho entre a multidão e enxugou o rosto ensanguentado de Jesus com um véu.

Meditemos: Um simples gesto de compaixão consola o Senhor. Que não tenhamos medo de agir com ternura diante do sofrimento alheio.`
    },

    {
      title:"7ª Estação – Jesus cai pela segunda vez",
      text:`Verdadeiramente ele tomou sobre si as nossas enfermidades e carregou as nossas dores (Is 53,4). Enfraquecido, Jesus cai novamente sob o peso da cruz.

Meditemos: Mesmo depois de cair de novo, Jesus se levanta. Ensina-nos a perseverar, sem desanimar diante das quedas repetidas.`
    },

    {
      title:"8ª Estação – Jesus consola as mulheres de Jerusalém",
      text:`Seguia-o grande multidão de povo e de mulheres que batiam no peito e o lamentavam. Jesus, voltando-se para elas, disse: Filhas de Jerusalém, não choreis por mim; chorai antes por vós mesmas e por vossos filhos (Lc 23,27-28).

Meditemos: Mesmo sofrendo, Jesus pensa nos outros. Que aprendamos a nos converter verdadeiramente, e não apenas a lamentar de longe.`
    },

    {
      title:"9ª Estação – Jesus cai pela terceira vez",
      text:`Ele foi maltratado, mas humilhou-se e não abriu a boca; como um cordeiro foi levado ao matadouro (Is 53,7). Pela terceira vez, Jesus cai, quase sem forças, próximo do Calvário.

Meditemos: Diante da fraqueza extrema de Jesus, pedimos força para não desistir, mesmo quando tudo parece perdido.`
    },

    {
      title:"10ª Estação – Jesus é despojado de suas vestes",
      text:`Os soldados, depois de terem crucificado Jesus, tomaram as suas vestes e repartiram em quatro partes... A túnica, porém, não tinha costura; foi feita toda de uma peça, de alto a baixo (Jo 19,23).

Meditemos: Jesus é despojado de tudo, até da própria dignidade aos olhos dos homens. Ensina-nos o desapego das coisas materiais.`
    },

    {
      title:"11ª Estação – Jesus é pregado na cruz",
      text:`Ali o crucificaram, e com ele outros dois, um de cada lado, e Jesus no meio (Jo 19,18).

Meditemos: Jesus se deixa pregar na cruz por amor a nós. Que respondamos a esse amor com fidelidade e gratidão.`
    },

    {
      title:"12ª Estação – Jesus morre na cruz",
      text:`Era já quase a hora sexta, e houve trevas sobre toda a terra até a hora nona... E, clamando Jesus com grande voz, disse: Pai, nas tuas mãos entrego o meu espírito. E, tendo dito isso, expirou (Lc 23,44.46).

Meditemos: No momento supremo, Jesus se entrega totalmente ao Pai. Que também nós saibamos confiar nossa vida a Deus.`
    },

    {
      title:"13ª Estação – Jesus é descido da cruz e entregue à sua Mãe",
      text:`José de Arimateia, discípulo de Jesus, embora oculto por medo dos judeus, pediu a Pilatos que lhe permitisse tirar o corpo de Jesus, e o entregou nos braços de sua Mãe (cf. Jo 19,38).

Meditemos: Maria recebe o corpo sem vida de seu Filho. Consideremos a dor daquela Mãe e peçamos a graça de acompanhá-la com fé.`
    },

    {
      title:"14ª Estação – Jesus é colocado no sepulcro",
      text:`Havia, perto do local onde fora crucificado, um jardim, e no jardim um sepulcro novo, onde ninguém jamais fora colocado. Ali depositaram Jesus (Jo 19,41-42).

Meditemos: O corpo de Jesus repousa no sepulcro, mas a nossa esperança não termina aqui — ela aponta para a ressurreição.`
    }

  ]

  estacoes.forEach((estacao)=>{

    steps.push({
      type:"mystery",
      title:estacao.title,
      text:`${versiculo}\n\n${estacao.text}`
    })

    steps.push({ type:"prayer", title:"Pai Nosso" })
    steps.push({ type:"prayer", title:"Ave Maria" })
    steps.push({ type:"prayer", title:"Glória ao Pai" })

  })

  /* =========================
   FINAL
  ========================= */

  steps.push({
    type:"prayer",
    title:"Oração Final",
    text:`Senhor Jesus Cristo, que por amor a nós quisestes percorrer o caminho da cruz e entregar a vida pela nossa salvação, concedei-nos a graça de meditar sempre a vossa Paixão, de carregar com fé as cruzes de cada dia e de um dia participar da glória da vossa ressurreição.

Vós que viveis e reinais com o Pai, na unidade do Espírito Santo, por todos os séculos dos séculos.

Amém.`
  })

  steps.push({
    type:"prayer",
    title:"Salve Rainha"
  })

  return steps

}
