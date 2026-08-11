import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

// Uma sugestão da seção "Para você hoje" da Home. Enviada já pronta pra UI:
// o front só escolhe o ícone pelo `icon` e navega pra `path`.
export type HomeSuggestion = {
  id: string;
  kind: 'rosary' | 'bible' | 'catechism';
  title: string;
  subtitle: string;
  why: string;   // etiqueta curta: "Continue", "Hábito", "Onde parou"
  icon: string;  // nome do ícone lucide (mapeado no front)
  path: string;
};

@Injectable()
export class HomeService {

  constructor(private prisma: PrismaService) {}

  // Sessão de terço incompleta mais recente que isso é "abandonada", não
  // "continue depois" — mesmo critério do RosaryService.
  private readonly STALE_SESSION_HOURS = 12;

  // Mistério tradicional de cada dia da semana (fuso do Brasil).
  private mysteryOfToday(): { slug: string; label: string } {

    const weekday = this.brazilWeekdayIndex();

    const byDay: Record<number, { slug: string; label: string }> = {
      0: { slug: 'gloriosos', label: 'Mistérios Gloriosos' }, // domingo
      1: { slug: 'gozosos', label: 'Mistérios Gozosos' },     // segunda
      2: { slug: 'dolorosos', label: 'Mistérios Dolorosos' }, // terça
      3: { slug: 'gloriosos', label: 'Mistérios Gloriosos' }, // quarta
      4: { slug: 'luminosos', label: 'Mistérios Luminosos' }, // quinta
      5: { slug: 'dolorosos', label: 'Mistérios Dolorosos' }, // sexta
      6: { slug: 'gozosos', label: 'Mistérios Gozosos' }      // sábado
    };

    return byDay[weekday] ?? byDay[0];
  }

  private brazilWeekdayIndex(): number {
    const map: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    };
    const wd = new Date().toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short'
    });
    return map[wd] ?? 0;
  }

  async feed(userId: string): Promise<{ suggestions: HomeSuggestion[] }> {

    const suggestions: HomeSuggestion[] = [];

    /* ---------- TERÇO ---------- */

    const cutoff = new Date(
      Date.now() - this.STALE_SESSION_HOURS * 60 * 60 * 1000
    );

    const activeRosary = await this.prisma.rosarySession.findFirst({
      where: {
        userId,
        completed: false,
        currentStep: { gt: 0 },
        startedAt: { gte: cutoff }
      },
      orderBy: { startedAt: 'desc' }
    });

    const stats = await this.prisma.spiritualStats.findUnique({
      where: { userId }
    });

    if (activeRosary) {

      // Tem um terço pausado → convida a retomar exatamente de onde parou.
      const label = this.labelForRosaryType(activeRosary.type);

      suggestions.push({
        id: 'rosary-resume',
        kind: 'rosary',
        title: 'Retome o Santo Terço',
        subtitle: `${label} · pausado`,
        why: 'Continue',
        icon: 'rosary',
        path: `/oratio/rosary/${activeRosary.type}?resumeStep=${activeRosary.currentStep}`
      });

    } else if ((stats?.rosariesPrayed ?? 0) > 0) {

      // Já reza terço, mas não há nenhum em aberto → sugere o mistério do dia.
      const today = this.mysteryOfToday();

      suggestions.push({
        id: 'rosary-habit',
        kind: 'rosary',
        title: 'Reze o Santo Terço',
        subtitle: today.label,
        why: 'Hábito',
        icon: 'rosary',
        path: `/oratio/rosary/${today.slug}`
      });

    }

    /* ---------- CONTINUE DE ONDE PAROU (leitura) ---------- */

    const readings = await this.prisma.readingProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });

    // Critério: uma única leitura "onde parou" — a mais recente (Bíblia OU
    // Catecismo, o que a pessoa mexeu por último). Evita empilhar as duas.
    const lastReading = readings[0]; // já ordenado por updatedAt desc

    if (lastReading?.kind === 'BIBLE') {
      suggestions.push({
        id: 'bible-continue',
        kind: 'bible',
        title: 'Volte à Bíblia',
        subtitle: lastReading.label,
        why: 'Onde parou',
        icon: 'bible',
        path: `/oratio/biblia/${lastReading.reference}`
      });
    } else if (lastReading?.kind === 'CATECHISM') {
      suggestions.push({
        id: 'catechism-continue',
        kind: 'catechism',
        title: 'Continue no Catecismo',
        subtitle: lastReading.label,
        why: 'Onde parou',
        icon: 'catechism',
        path: '/oratio/catecismo'
      });
    }

    return { suggestions };
  }

  private labelForRosaryType(type: string): string {
    const labels: Record<string, string> = {
      gozosos: 'Mistérios Gozosos',
      dolorosos: 'Mistérios Dolorosos',
      gloriosos: 'Mistérios Gloriosos',
      luminosos: 'Mistérios Luminosos',
      'sete-dores': 'Coroa das Sete Dores',
      misericordia: 'Terço da Misericórdia',
      'sagrado-coracao': 'Terço do Sagrado Coração',
      'sao-jose': 'Terço de São José',
      'sao-miguel': 'Terço de São Miguel',
      'sao-bento': 'Terço de São Bento',
      'espirito-santo': 'Terço do Espírito Santo',
      'coroa-lagrimas': 'Coroa das Lágrimas',
      'via-sacra': 'Via-Sacra'
    };
    return labels[type] ?? 'Santo Terço';
  }

}
