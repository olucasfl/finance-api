import { contentFilter } from './vox.content-filter';

describe('contentFilter', () => {

  it.each([
    'Qual é o meu horóscopo de hoje?',
    'Você acredita em astrologia?',
    'Pode fazer meu tarot?',
    'Como funciona a magia branca?',
    'Existe algum feitiço na Bíblia?',
    'O que a Igreja pensa do espiritismo?',
    'O que é ocultismo?',
  ])('blocks a message mentioning a forbidden topic: %s', (message) => {
    const result = contentFilter(message);

    expect(result.blocked).toBe(true);
    expect(result.message).toBe(
      'Como assistente espiritual católico, não posso orientar sobre esse tema.',
    );
  });

  it('is case-insensitive', () => {
    const result = contentFilter('Qual é o meu HORÓSCOPO de hoje?');
    expect(result.blocked).toBe(true);
  });

  it('lets an ordinary spiritual question through', () => {
    const result = contentFilter('Como posso rezar o terço hoje à noite?');

    expect(result).toEqual({ blocked: false });
  });

  it('lets an empty message through (nothing to match)', () => {
    const result = contentFilter('');
    expect(result).toEqual({ blocked: false });
  });

});
