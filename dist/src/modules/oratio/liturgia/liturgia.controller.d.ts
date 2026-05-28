import { LiturgiaService } from "./liturgia.service";
export declare class LiturgiaController {
    private readonly liturgiaService;
    constructor(liturgiaService: LiturgiaService);
    getToday(): Promise<any>;
    getFull(dia: string, mes: string, ano: string): Promise<{
        tipo: string;
        data: any;
        cor: any;
        liturgia: any;
        secoes: ({
            titulo: string;
            conteudo: {
                entrada: {
                    antifona: any;
                };
                sinalDaCruz: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                saudacao: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                atoPenitencial: ({
                    padre: string;
                    todos?: undefined;
                    assembleia?: undefined;
                } | {
                    todos: string;
                    padre?: undefined;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                    todos?: undefined;
                })[];
                gloria: string | null;
                coleta: any;
                primeiraLeitura?: undefined;
                salmo?: undefined;
                segundaLeitura?: undefined;
                aclamacao?: undefined;
                evangelho?: undefined;
                credo?: undefined;
                tituloOracaoEucaristica?: undefined;
                ofertorio?: undefined;
                oracaoSobreOferendas?: undefined;
                convite?: undefined;
                prefacio?: undefined;
                santo?: undefined;
                inicioOracaoEucaristica?: undefined;
                epicleseAntesConsagracao?: undefined;
                consagracao?: undefined;
                misterioDaFe?: undefined;
                posConsagracao?: undefined;
                doxologia?: undefined;
                convitePaiNosso?: undefined;
                paiNosso?: undefined;
                embolo?: undefined;
                ritoDaPaz?: undefined;
                cordeiro?: undefined;
                antifona?: undefined;
                depois?: undefined;
                bencao?: undefined;
                envio?: undefined;
            };
        } | {
            titulo: string;
            conteudo: {
                primeiraLeitura: {
                    titulo: any;
                    referencia: any;
                    texto: any;
                    final: ({
                        padre: string;
                        assembleia?: undefined;
                    } | {
                        assembleia: string;
                        padre?: undefined;
                    })[];
                };
                salmo: {
                    referencia: any;
                    refrao: any;
                    texto: any;
                };
                segundaLeitura: {
                    titulo: any;
                    referencia: any;
                    texto: any;
                    final: ({
                        padre: string;
                        assembleia?: undefined;
                    } | {
                        assembleia: string;
                        padre?: undefined;
                    })[];
                } | null;
                aclamacao: {
                    todos: string;
                }[];
                evangelho: {
                    abertura: ({
                        assembleia: string;
                        padre?: undefined;
                    } | {
                        padre: any;
                        assembleia?: undefined;
                    })[];
                    referencia: any;
                    texto: any;
                    final: ({
                        padre: string;
                        assembleia?: undefined;
                    } | {
                        assembleia: string;
                        padre?: undefined;
                    })[];
                };
                credo: string | null;
                entrada?: undefined;
                sinalDaCruz?: undefined;
                saudacao?: undefined;
                atoPenitencial?: undefined;
                gloria?: undefined;
                coleta?: undefined;
                tituloOracaoEucaristica?: undefined;
                ofertorio?: undefined;
                oracaoSobreOferendas?: undefined;
                convite?: undefined;
                prefacio?: undefined;
                santo?: undefined;
                inicioOracaoEucaristica?: undefined;
                epicleseAntesConsagracao?: undefined;
                consagracao?: undefined;
                misterioDaFe?: undefined;
                posConsagracao?: undefined;
                doxologia?: undefined;
                convitePaiNosso?: undefined;
                paiNosso?: undefined;
                embolo?: undefined;
                ritoDaPaz?: undefined;
                cordeiro?: undefined;
                antifona?: undefined;
                depois?: undefined;
                bencao?: undefined;
                envio?: undefined;
            };
        } | {
            titulo: string;
            conteudo: {
                tituloOracaoEucaristica: string;
                ofertorio: null;
                oracaoSobreOferendas: ({
                    padre: any;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                convite: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                prefacio: {
                    dialogo: ({
                        padre: string;
                        assembleia?: undefined;
                    } | {
                        assembleia: string;
                        padre?: undefined;
                    })[];
                    texto: {
                        padre: string;
                    }[];
                };
                santo: string;
                inicioOracaoEucaristica: {
                    padre: string;
                }[];
                epicleseAntesConsagracao: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                consagracao: {
                    padre: string;
                }[];
                misterioDaFe: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                posConsagracao: {
                    anamnese_oblacao: ({
                        padre: string;
                        assembleia?: undefined;
                    } | {
                        assembleia: string;
                        padre?: undefined;
                    })[];
                    epiclese: ({
                        padre: string;
                        assembleia?: undefined;
                    } | {
                        assembleia: string;
                        padre?: undefined;
                    })[];
                    intercessoes: ({
                        padre: string;
                        assembleia?: undefined;
                    } | {
                        assembleia: string;
                        padre?: undefined;
                    })[][];
                };
                doxologia: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                entrada?: undefined;
                sinalDaCruz?: undefined;
                saudacao?: undefined;
                atoPenitencial?: undefined;
                gloria?: undefined;
                coleta?: undefined;
                primeiraLeitura?: undefined;
                salmo?: undefined;
                segundaLeitura?: undefined;
                aclamacao?: undefined;
                evangelho?: undefined;
                credo?: undefined;
                convitePaiNosso?: undefined;
                paiNosso?: undefined;
                embolo?: undefined;
                ritoDaPaz?: undefined;
                cordeiro?: undefined;
                antifona?: undefined;
                depois?: undefined;
                bencao?: undefined;
                envio?: undefined;
            };
        } | {
            titulo: string;
            conteudo: {
                convitePaiNosso: {
                    padre: string;
                }[];
                paiNosso: {
                    todos: string;
                }[];
                embolo: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                ritoDaPaz: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                cordeiro: {
                    todos: string;
                }[];
                convite: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                antifona: any;
                depois: any;
                entrada?: undefined;
                sinalDaCruz?: undefined;
                saudacao?: undefined;
                atoPenitencial?: undefined;
                gloria?: undefined;
                coleta?: undefined;
                primeiraLeitura?: undefined;
                salmo?: undefined;
                segundaLeitura?: undefined;
                aclamacao?: undefined;
                evangelho?: undefined;
                credo?: undefined;
                tituloOracaoEucaristica?: undefined;
                ofertorio?: undefined;
                oracaoSobreOferendas?: undefined;
                prefacio?: undefined;
                santo?: undefined;
                inicioOracaoEucaristica?: undefined;
                epicleseAntesConsagracao?: undefined;
                consagracao?: undefined;
                misterioDaFe?: undefined;
                posConsagracao?: undefined;
                doxologia?: undefined;
                bencao?: undefined;
                envio?: undefined;
            };
        } | {
            titulo: string;
            conteudo: {
                bencao: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                envio: ({
                    padre: string;
                    assembleia?: undefined;
                } | {
                    assembleia: string;
                    padre?: undefined;
                })[];
                entrada?: undefined;
                sinalDaCruz?: undefined;
                saudacao?: undefined;
                atoPenitencial?: undefined;
                gloria?: undefined;
                coleta?: undefined;
                primeiraLeitura?: undefined;
                salmo?: undefined;
                segundaLeitura?: undefined;
                aclamacao?: undefined;
                evangelho?: undefined;
                credo?: undefined;
                tituloOracaoEucaristica?: undefined;
                ofertorio?: undefined;
                oracaoSobreOferendas?: undefined;
                convite?: undefined;
                prefacio?: undefined;
                santo?: undefined;
                inicioOracaoEucaristica?: undefined;
                epicleseAntesConsagracao?: undefined;
                consagracao?: undefined;
                misterioDaFe?: undefined;
                posConsagracao?: undefined;
                doxologia?: undefined;
                convitePaiNosso?: undefined;
                paiNosso?: undefined;
                embolo?: undefined;
                ritoDaPaz?: undefined;
                cordeiro?: undefined;
                antifona?: undefined;
                depois?: undefined;
            };
        })[];
    }>;
}
