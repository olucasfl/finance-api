export function buildMissa(data: any) {

  const isDomingo = data.leituras.segundaLeitura?.length > 0
  const oracaoEucaristica = isDomingo ? 3 : 2

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
          posConsagracao:
            oracaoEucaristica === 2
              ? {
                  anamnese_oblacao: [
                    {
                      padre: `Celebrando, pois, a memória da morte e ressurreição do vosso Filho,
                  nós vos oferecemos, ó Pai, o pão da vida e o cálice da salvação,
                  e vos agradecemos porque nos tornastes dignos de estar aqui na vossa presença e vos servir.`
                    },
                    {
                      assembleia: "Aceitai, ó Senhor, a nossa oferta!"
                    }
                  ],

                  epiclese: [
                    {
                      padre: `E nós vos suplicamos que, participando do Corpo e Sangue de Cristo,
                  sejamos reunidos pelo Espírito Santo num só corpo.`
                    },
                    {
                      assembleia: "O Espírito nos una num só corpo!"
                    }
                  ],

                  intercessoes: [
                    [
                      {
                        padre: `Lembrai-vos, ó Pai, da vossa Igreja que se faz presente pelo mundo inteiro;
                  que ela cresça na caridade com o Papa, o nosso bispo e todos os ministros do vosso povo.`
                      },
                      {
                        assembleia: "Lembrai-vos, ó Pai, da vossa Igreja!"
                      }
                    ],
                    [
                      {
                        padre: `Lembrai-vos também dos nossos irmãos e irmãs que morreram na esperança da ressurreição
                  e de todos os que partiram desta vida; acolhei-os junto a vós na luz da vossa face.`
                      },
                      {
                        assembleia: "Concedei-lhes, ó Senhor, a luz eterna!"
                      }
                    ],
                    [
                      {
                        padre: `Enfim, nós vos pedimos, tende piedade de todos nós e dai-nos participar da vida eterna,
                  com a Virgem Maria, Mãe de Deus, São José, os Apóstolos e todos os santos,
                  que na vida souberam amar Cristo e seus irmãos.`
                      },
                      {
                        assembleia: "Concedei-nos o convívio dos eleitos!"
                      }
                    ]
                  ]
                }
              : {
                  anamnese_oblacao: [
                    {
                      padre: `Celebrando agora, ó Pai, o memorial da paixão redentora do vosso Filho,
                  da sua gloriosa ressurreição e ascensão ao céu,
                  e enquanto esperamos sua nova vinda,
                  nós vos oferecemos em ação de graças este sacrifício vivo e santo.`
                    },
                    {
                      assembleia: "Aceitai, ó Senhor, a nossa oferta!"
                    }
                  ],

                  epiclese: [
                    {
                      padre: `Olhai com bondade a oblação da vossa Igreja
                  e reconhecei nela o sacrifício que nos reconciliou convosco;
                  concedei que, alimentando-nos com o Corpo e o Sangue do vosso Filho,
                  repletos do Espírito Santo,
                  nos tornemos em Cristo um só corpo e um só espírito.`
                    },
                    {
                      assembleia: "O Espírito nos una num só corpo!"
                    }
                  ],

                  intercessoes: [
                    [
                      {
                        padre: `Que o mesmo Espírito faça de nós uma eterna oferenda
                  para alcançarmos a herança com os vossos eleitos:
                  a santíssima Virgem Maria, São José, os Apóstolos e todos os Santos.`
                      },
                      {
                        assembleia: "Fazei de nós uma perfeita oferenda!"
                      }
                    ],
                    [
                      {
                        padre: `Nós vos suplicamos, Senhor,
                  que este sacrifício da nossa reconciliação estenda a paz e a salvação ao mundo inteiro;
                  confirmai na fé e na caridade a vossa Igreja.`
                      },
                      {
                        assembleia: "Lembrai-vos, ó Pai, da vossa Igreja!"
                      }
                    ],
                    [
                      {
                        padre: `Acolhei com bondade no vosso reino os nossos irmãos e irmãs que partiram desta vida
                  e todos os que morreram na vossa amizade.`
                      },
                      {
                        assembleia: "Concedei-lhes, ó Senhor, a luz eterna!"
                      }
                    ],
                    [
                      {
                        padre: `Enfim, concedei também a nós chegarmos à morada eterna,
                  onde viveremos para sempre convosco e com todos os santos.`
                      },
                      {
                        assembleia: "Concedei-nos o convívio dos eleitos!"
                      }
                    ]
                  ]
                },

          doxologia: [
            {
              padre:
                "Por Cristo, com Cristo e em Cristo, a vós, Deus Pai todo-poderoso, na unidade do Espírito Santo, toda honra e toda glória, agora e para sempre."
            },
            { assembleia: "Amém." }
          ],

        }
      },

      /* ========================= */
      /* RITOS DA COMUNHÃO */
      /* ========================= */

      {
        titulo: "Ritos da Comunhão",
        conteudo: {

          convitePaiNosso: [
            {
              padre: "Obedientes à palavra do Salvador e formados por seu divino ensinamento, ousamos dizer:"
            }
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

              ritoDaPaz: [
                  { padre: "A paz do Senhor esteja sempre convosco." },
                  { assembleia: "O amor de Cristo nos uniu." },
                  { padre: "Dai uns aos outros um sinal de paz." }
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