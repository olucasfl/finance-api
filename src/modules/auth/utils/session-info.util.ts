/*
Rotulagem de dispositivo/local pra sessão — tudo aqui é best-effort.
Nada disso pode fazer o login falhar: se o parsing der branco ou a
geolocalização não responder, a sessão simplesmente fica sem esses
campos (nulos), nunca derruba o fluxo de autenticação.
*/

export function parseDeviceLabel(userAgent?: string | null): string {

  if (!userAgent) return 'Dispositivo desconhecido';

  const ua = userAgent;

  let browser = 'Navegador';
  if (/EdgiOS|Edge|Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome|CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  let os = 'sistema desconhecido';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} · ${os}`;
}

export function getClientIp(req: any): string | undefined {

  const forwarded = req?.headers?.['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req?.ip || req?.socket?.remoteAddress || undefined;
}

const PRIVATE_IP_PATTERN =
  /^(::1|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

// ip-api.com — tier gratuito, sem chave, ~45 req/min. Suficiente pro
// volume de login desse app; se um dia isso virar gargalo, dá pra
// trocar de provedor sem mudar nada fora deste arquivo.
export async function resolveLocation(ip?: string | null): Promise<string | null> {

  if (!ip || PRIVATE_IP_PATTERN.test(ip)) return null;

  try {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,country`,
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data: any = await res.json();

    if (data?.status !== 'success') return null;

    const parts = [data.city, data.country].filter(Boolean);

    return parts.length ? parts.join(', ') : null;

  } catch {
    return null;
  }

}
