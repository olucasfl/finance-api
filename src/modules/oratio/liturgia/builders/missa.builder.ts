export function buildMissa(data: any) {

  const isDomingo = data.leituras.segundaLeitura?.length > 0

  return {
    tipo: isDomingo ? "domingo" : "semana",
    data: data.data,
    cor: data.cor,
    liturgia: data.liturgia,

    secoes: [

      /* ========================= */
      /* RITOS INICIAIS */
      /* ========================= */

      {
        titulo: "Ritos Iniciais",
        conteudo: {

          entrada: {
            antifona: data.antifonas.entrada
          },

          sinalDaCruz: [
            { padre: "Em nome do Pai, e do Filho e do Espírito Santo." },
            { assembleia: "Amém." }
          ],

          saudacao: [
            { padre: "O Senhor esteja convosco." },
            { assembleia: "Ele está no meio de nós." }
          ],

          atoPenitencial: [
            { padre: "Confessemos os nossos pecados." },
            {
              todos: `Confesso a Deus todo-poderoso e a vós, irmãos e irmãs,
que pequei muitas vezes por pensamentos e palavras,
atos e omissões,
por minha culpa, minha culpa, minha tão grande culpa.
E peço à Virgem Maria, aos anjos e santos,
e a vós, irmãos e irmãs,
que rogueis por mim a Deus, nosso Senhor.`
            },
            {
              padre:
                "Deus todo-poderoso tenha compaixão de nós, perdoe os nossos pecados e nos conduza à vida eterna."
            },
            { assembleia: "Amém." }
          ],

          gloria: isDomingo
            ? `Glória a Deus nas alturas
e paz na terra aos homens por Ele amados.
Senhor Deus, Rei dos céus, Deus Pai todo-poderoso.
Nós vos louvamos, nós vos bendizemos,
nós vos adoramos, nós vos glorificamos,
nós vos damos graças por vossa imensa glória.
Senhor Jesus Cristo, Filho Unigênito,
Senhor Deus, Cordeiro de Deus, Filho de Deus Pai.
Vós que tirais o pecado do mundo, tende piedade de nós.
Vós que tirais o pecado do mundo, acolhei a nossa súplica.
Vós que estais à direita do Pai, tende piedade de nós.
Só vós sois o Santo, só vós, o Senhor,
só vós, o Altíssimo, Jesus Cristo,
com o Espírito Santo, na glória de Deus Pai.
Amém.`
            : null,

          coleta: data.oracoes.coleta
        }
      },

      /* ========================= */
      /* LITURGIA DA PALAVRA */
      /* ========================= */

      {
        titulo: "Liturgia da Palavra",
        conteudo: {

          primeiraLeitura: {
            titulo: data.leituras.primeiraLeitura?.[0]?.titulo,
            referencia: data.leituras.primeiraLeitura?.[0]?.referencia,
            texto: data.leituras.primeiraLeitura?.[0]?.texto,

            final: [
              { padre: "Palavra do Senhor." },
              { assembleia: "Graças a Deus." }
            ]
          },

          salmo: {
            referencia: data.leituras.salmo?.[0]?.referencia,
            refrao: data.leituras.salmo?.[0]?.refrao,
            texto: data.leituras.salmo?.[0]?.texto
          },

          segundaLeitura: isDomingo
            ? {
                titulo: data.leituras.segundaLeitura?.[0]?.titulo,
                referencia: data.leituras.segundaLeitura?.[0]?.referencia,
                texto: data.leituras.segundaLeitura?.[0]?.texto,

                final: [
                  { padre: "Palavra do Senhor." },
                  { assembleia: "Graças a Deus." }
                ]
              }
            : null,

          aclamacao: [
            { todos: "Aleluia, Aleluia, Aleluia." }
          ],

          evangelho: {
            abertura: [
              { padre: "O Senhor esteja convosco." },
              { assembleia: "Ele está no meio de nós." },
              { padre: data.leituras.evangelho?.[0]?.titulo },
              { assembleia: "Glória a vós, Senhor." }
            ],

            referencia: data.leituras.evangelho?.[0]?.referencia,
            texto: data.leituras.evangelho?.[0]?.texto,

            final: [
              { padre: "Palavra da Salvação." },
              { assembleia: "Glória a vós, Senhor." }
            ]
          },

          credo: isDomingo
            ? `Creio em Deus Pai todo-poderoso,
Criador do céu e da terra,
e em Jesus Cristo, seu único Filho, nosso Senhor,
que foi concebido pelo poder do Espírito Santo;
nasceu da Virgem Maria;
padeceu sob Pôncio Pilatos,
foi crucificado, morto e sepultado;
desceu à mansão dos mortos;
ressuscitou ao terceiro dia;
subiu aos céus;
está sentado à direita de Deus Pai todo-poderoso,
donde há de vir a julgar os vivos e os mortos.
Creio no Espírito Santo;
na Santa Igreja Católica;
na comunhão dos santos;
na remissão dos pecados;
na ressurreição da carne;
na vida eterna.
Amém.`
            : null
        }
      },

      /* ========================= */
      /* LITURGIA EUCARÍSTICA */
      /* ========================= */

      {
        titulo: "Liturgia Eucarística",
        conteudo: {

          ofertorio: data.oracoes.oferendas,

          convite: [
            {
              padre:
                "Orai, irmãos e irmãs, para que o meu e vosso sacrifício seja aceito por Deus Pai todo-poderoso."
            },
            {
              assembleia:
                "Receba o Senhor por tuas mãos este sacrifício, para glória do seu nome, para nosso bem e de toda a sua santa Igreja."
            }
          ],

          prefacio: [
            { padre: "O Senhor esteja convosco." },
            { assembleia: "Ele está no meio de nós." },
            { padre: "Corações ao alto." },
            { assembleia: "O nosso coração está em Deus." },
            { padre: "Demos graças ao Senhor, nosso Deus." },
            { assembleia: "É nosso dever e nossa salvação." }
            ],

          santo: `Santo, Santo, Santo,
Senhor Deus do universo.
O céu e a terra proclamam a vossa glória.
Hosana nas alturas.
Bendito o que vem em nome do Senhor.
Hosana nas alturas.`,

          /* 🔥 CONSAGRAÇÃO */

          consagracao: [
            {
              padre: `Tomai todos e comei:
isto é o meu Corpo,
que será entregue por vós.`
            },
            {
              padre: `Tomai todos e bebei:
este é o cálice do meu Sangue,
o Sangue da nova e eterna aliança,
que será derramado por vós e por todos
para remissão dos pecados.
Fazei isto em memória de mim.`
            }
          ],

          misterioDaFe: [
            { padre: "Eis o mistério da fé!" },
            {
              assembleia:
                "Anunciamos, Senhor, a vossa morte e proclamamos a vossa ressurreição. Vinde, Senhor Jesus!"
            }
          ],

          doxologia: [
            {
              padre:
                "Por Cristo, com Cristo e em Cristo, a vós, Deus Pai todo-poderoso, na unidade do Espírito Santo, toda honra e toda glória, agora e para sempre."
            },
            { assembleia: "Amém." }
          ],

          paiNosso: [
            {
              todos: `Pai nosso que estais nos céus,
santificado seja o vosso nome;
venha a nós o vosso Reino;
seja feita a vossa vontade,
assim na terra como no céu.
O pão nosso de cada dia nos dai hoje;
perdoai-nos as nossas ofensas,
assim como nós perdoamos a quem nos tem ofendido;
e não nos deixeis cair em tentação,
mas livrai-nos do mal.`
            }
          ],

          embolo: [
            {
                padre:
                "Livrai-nos de todos os males, ó Pai, e dai-nos hoje a vossa paz. Ajudados pela vossa misericórdia, sejamos sempre livres do pecado e protegidos de todos os perigos, enquanto, vivendo a esperança, aguardamos a vinda do Cristo Salvador."
            },
            {
                assembleia:
                "Vosso é o reino, o poder e a glória para sempre!"
            }
            ],

          cordeiro: [
            {
              todos: `Cordeiro de Deus, que tirais o pecado do mundo,
tende piedade de nós.
Cordeiro de Deus, que tirais o pecado do mundo,
tende piedade de nós.
Cordeiro de Deus, que tirais o pecado do mundo,
dai-nos a paz.`
            }
          ],

        }
      },

      /* ========================= */
      /* RITOS DA COMUNHÃO */
      /* ========================= */

      {
        titulo: "Ritos da Comunhão",
        conteudo: {

          convite: [
            { padre: "Felizes os convidados para a Ceia do Senhor." },
            {
              assembleia:
                "Senhor, eu não sou digno de que entreis em minha morada, mas dizei uma palavra e serei salvo."
            }
          ],

          antifona: data.antifonas.comunhao,

          depois: data.oracoes.comunhao
        }
      },

      /* ========================= */
      /* RITOS FINAIS */
      /* ========================= */

      {
        titulo: "Ritos Finais",
        conteudo: {

          bencao: [
            { padre: "O Senhor esteja convosco." },
            { assembleia: "Ele está no meio de nós." },
            {
              padre:
                "Abençoe-vos Deus todo-poderoso, Pai e Filho e Espírito Santo."
            },
            { assembleia: "Amém." }
          ],

          envio: [
            { padre: "Ide em paz e o Senhor vos acompanhe." },
            { assembleia: "Graças a Deus." }
          ]
        }
      }

    ]
  }
}