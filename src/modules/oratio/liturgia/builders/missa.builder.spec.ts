import { buildMissa } from './missa.builder';

/*
buildMissa é uma função pura que molda o retorno cru da API pública de
liturgia (https://liturgia.up.railway.app) na estrutura de seções que o
frontend renderiza. A única ramificação real é `isDomingo`, derivada de
`leituras.segundaLeitura` ter conteúdo — domingo tem 2ª leitura, Glória,
Credo e a Oração Eucarística III; dia de semana não.
*/

function weekdayFixture() {
  return {
    data: '2026-03-11',
    cor: 'Verde',
    liturgia: 'Quarta-feira da 3ª semana do Tempo Comum',
    antifonas: { entrada: 'Antífona de entrada', comunhao: 'Antífona de comunhão' },
    oracoes: { coleta: 'Oração da coleta', oferendas: 'Oração sobre as oferendas', comunhao: 'Oração depois da comunhão' },
    leituras: {
      primeiraLeitura: [{ titulo: 'Leitura do livro', referencia: 'Gn 1,1-5', texto: '1No princípio...' }],
      salmo: [{ referencia: 'Sl 8', refrao: 'Como é grande o vosso nome', texto: '1Ó Senhor...' }],
      segundaLeitura: [], // dia de semana não tem 2ª leitura
      evangelho: [{ titulo: 'Evangelho de Jesus Cristo segundo Marcos', referencia: 'Mc 1,1-8', texto: '1Início do Evangelho...' }],
    },
  };
}

function sundayFixture() {
  const fixture = weekdayFixture();
  return {
    ...fixture,
    data: '2026-03-15',
    liturgia: '3º Domingo do Tempo Comum',
    leituras: {
      ...fixture.leituras,
      segundaLeitura: [{ titulo: 'Leitura da carta', referencia: '1Cor 1,10-13', texto: '10Rogo-vos, irmãos...' }],
    },
  };
}

describe('buildMissa', () => {

  describe('weekday Mass (no segundaLeitura)', () => {
    const missa = buildMissa(weekdayFixture());

    it('is tagged as "semana"', () => {
      expect(missa.tipo).toBe('semana');
    });

    it('carries through the top-level fields', () => {
      expect(missa.data).toBe('2026-03-11');
      expect(missa.cor).toBe('Verde');
      expect(missa.liturgia).toBe('Quarta-feira da 3ª semana do Tempo Comum');
    });

    it('has the four standard sections in order', () => {
      expect(missa.secoes.map((s: any) => s.titulo)).toEqual([
        'Ritos Iniciais',
        'Liturgia da Palavra',
        'Liturgia Eucarística',
        'Ritos da Comunhão',
        'Ritos Finais',
      ]);
    });

    it('omits the Gloria and the Creed on a weekday', () => {
      const ritosIniciais = missa.secoes[0].conteudo;
      const liturgiaDaPalavra = missa.secoes[1].conteudo;

      expect(ritosIniciais.gloria).toBeNull();
      expect(liturgiaDaPalavra.credo).toBeNull();
    });

    it('omits the second reading on a weekday', () => {
      const liturgiaDaPalavra = missa.secoes[1].conteudo;
      expect(liturgiaDaPalavra.segundaLeitura).toBeNull();
    });

    it('uses Eucharistic Prayer II on a weekday', () => {
      const eucaristica = missa.secoes[2].conteudo;
      expect(eucaristica.tituloOracaoEucaristica).toBe('Oração Eucarística II');
    });

    it('fills in the first reading and gospel text from the source data', () => {
      const liturgiaDaPalavra = missa.secoes[1].conteudo;
      expect(liturgiaDaPalavra.primeiraLeitura.referencia).toBe('Gn 1,1-5');
      expect(liturgiaDaPalavra.primeiraLeitura.texto).toBe('1No princípio...');
      expect(liturgiaDaPalavra.evangelho.referencia).toBe('Mc 1,1-8');
      expect(liturgiaDaPalavra.evangelho.texto).toBe('1Início do Evangelho...');
    });
  });

  describe('Sunday Mass (has segundaLeitura)', () => {
    const missa = buildMissa(sundayFixture());

    it('is tagged as "domingo"', () => {
      expect(missa.tipo).toBe('domingo');
    });

    it('includes the Gloria and the Creed', () => {
      const ritosIniciais = missa.secoes[0].conteudo;
      const liturgiaDaPalavra = missa.secoes[1].conteudo;

      expect(ritosIniciais.gloria).toContain('Glória a Deus nas alturas');
      expect(liturgiaDaPalavra.credo).toContain('Creio em Deus Pai todo-poderoso');
    });

    it('includes the second reading with its own closing dialogue', () => {
      const liturgiaDaPalavra = missa.secoes[1].conteudo;

      expect(liturgiaDaPalavra.segundaLeitura).not.toBeNull();
      expect(liturgiaDaPalavra.segundaLeitura.referencia).toBe('1Cor 1,10-13');
      expect(liturgiaDaPalavra.segundaLeitura.final).toEqual([
        { padre: 'Palavra do Senhor.' },
        { assembleia: 'Graças a Deus.' },
      ]);
    });

    it('uses Eucharistic Prayer III, the third option only available on Sunday', () => {
      const eucaristica = missa.secoes[2].conteudo;
      expect(eucaristica.tituloOracaoEucaristica).toBe('Oração Eucarística III');
    });

    it('uses the matching consecration and post-consecration text for Prayer III', () => {
      const eucaristica = missa.secoes[2].conteudo;

      // Prayer III's consecration wording differs from Prayer II's ("ao fim da Ceia" vs "no fim da Ceia")
      expect(eucaristica.consagracao[1].padre).toContain('ao fim da Ceia');
      expect(eucaristica.posConsagracao.intercessoes).toHaveLength(3);
    });
  });

  describe('shared structure regardless of isDomingo', () => {
    it('always has the same fixed closing rites', () => {
      const weekday = buildMissa(weekdayFixture());
      const sunday = buildMissa(sundayFixture());

      expect(weekday.secoes[4]).toEqual(sunday.secoes[4]);
      expect(weekday.secoes[4].titulo).toBe('Ritos Finais');
    });

    it('always builds the Eucharistic prayer II dialogue with 3 rounds of call-and-response', () => {
      const missa = buildMissa(weekdayFixture());
      const eucaristica = missa.secoes[2].conteudo;

      expect(eucaristica.prefacio.dialogo).toHaveLength(6);
    });
  });

});
