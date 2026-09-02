import {
  VOX_IDENTITY,
  VOX_PROFILES,
  VOX_PROFILE_KEYS,
  resolveVoxProfile,
} from './vox.prompt';

describe('vox.prompt', () => {
  describe('VOX_IDENTITY', () => {
    it('keeps the doctrinal identity and formatting rules', () => {
      expect(VOX_IDENTITY).toContain('VOX');
      expect(VOX_IDENTITY).toContain('Catecismo da Igreja Católica');
      expect(VOX_IDENTITY).toContain('blockquote');
      expect(VOX_IDENTITY).toContain('# O Ano Litúrgico');
    });

    it('no longer forces the "daily application / full architecture / final summary" mold', () => {
      expect(VOX_IDENTITY).not.toContain('# Aplicação prática');
      expect(VOX_IDENTITY).not.toContain('# Arquitetura de uma resposta completa');
      expect(VOX_IDENTITY).not.toContain('# Resumo final');
    });
  });

  describe('VOX_PROFILES', () => {
    it('exposes exactly the six known keys', () => {
      expect([...VOX_PROFILE_KEYS].sort()).toEqual(
        ['APOLOGETIC', 'CATECHIST', 'DEFAULT', 'DIRECT', 'PASTORAL', 'STUDY'].sort(),
      );
    });

    it('every profile carries key/label/short and a positive maxTokens', () => {
      for (const key of VOX_PROFILE_KEYS) {
        const p = VOX_PROFILES[key];
        expect(p.key).toBe(key);
        expect(p.label.length).toBeGreaterThan(0);
        expect(p.short.length).toBeGreaterThan(0);
        expect(p.maxTokens).toBeGreaterThan(0);
        expect(Array.isArray(p.examples)).toBe(true);
      }
    });

    it('DEFAULT is the destravado profile and is fully filled', () => {
      const d = VOX_PROFILES.DEFAULT;
      expect(d.label).toBe('Padrão');
      expect(d.systemAppend).toContain('Estilo de resposta ativo');
      expect(d.systemAppend.toLowerCase()).toContain('não existe molde fixo');
      expect(d.maxTokens).toBe(1500);
    });

    it('applies the per-profile max_tokens budget', () => {
      expect(VOX_PROFILES.DIRECT.maxTokens).toBe(600);
      expect(VOX_PROFILES.STUDY.maxTokens).toBe(2600);
      expect(VOX_PROFILES.PASTORAL.maxTokens).toBe(1800);
      expect(VOX_PROFILES.CATECHIST.maxTokens).toBe(1800);
      expect(VOX_PROFILES.APOLOGETIC.maxTokens).toBe(1800);
    });

    it('every profile has a filled style block, details and exactly one example', () => {
      for (const key of VOX_PROFILE_KEYS) {
        const p = VOX_PROFILES[key];
        expect(p.systemAppend).toContain('# Estilo de resposta ativo:');
        expect(p.details.trim().length).toBeGreaterThan(0);
        expect(p.examples).toHaveLength(1);
        expect(p.examples[0].question.length).toBeGreaterThan(0);
        expect(p.examples[0].answer.length).toBeGreaterThan(0);
      }
    });

    it('each dynamic profile carries its own distinct style block', () => {
      expect(VOX_PROFILES.DIRECT.systemAppend).toContain('Direto ao ponto');
      expect(VOX_PROFILES.STUDY.systemAppend).toContain('Profundo');
      expect(VOX_PROFILES.PASTORAL.systemAppend).toContain('Pastoral');
      expect(VOX_PROFILES.CATECHIST.systemAppend).toContain('Catequista');
      expect(VOX_PROFILES.APOLOGETIC.systemAppend).toContain('Apologético');
    });
  });

  describe('resolveVoxProfile', () => {
    it('returns the matching profile for a valid key', () => {
      expect(resolveVoxProfile('STUDY')).toBe(VOX_PROFILES.STUDY);
      expect(resolveVoxProfile('DEFAULT')).toBe(VOX_PROFILES.DEFAULT);
    });

    it('falls back to DEFAULT for null, undefined, empty or an unknown key', () => {
      expect(resolveVoxProfile(null)).toBe(VOX_PROFILES.DEFAULT);
      expect(resolveVoxProfile(undefined)).toBe(VOX_PROFILES.DEFAULT);
      expect(resolveVoxProfile('')).toBe(VOX_PROFILES.DEFAULT);
      expect(resolveVoxProfile('NOPE')).toBe(VOX_PROFILES.DEFAULT);
    });
  });
});
