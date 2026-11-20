export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  check(key: string, nowMs = Date.now()): RateLimitDecision {
    const cutoff = nowMs - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= this.maxRequests) {
      this.hits.set(key, recent);
      const oldest = recent[0] ?? nowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAtMs: oldest + this.windowMs,
      };
    }

    recent.push(nowMs);
    this.hits.set(key, recent);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - recent.length),
      resetAtMs: nowMs + this.windowMs,
    };
  }
}

export interface ValidatedInterpretInput {
  prompt: string;
  preferredLanguage: 'en' | 'bn' | 'bi';
  screenSummary?: string;
  installedAppNames: string[];
}

export function validateInterpretBody(
  body: unknown
): { ok: true; data: ValidatedInterpretInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const record = body as Record<string, unknown>;
  const rawPrompt = typeof record.prompt === 'string' ? record.prompt.trim() : '';
  if (!rawPrompt) {
    return { ok: false, error: 'Prompt is required and cannot be empty.' };
  }
  if (rawPrompt.length > 1500) {
    return { ok: false, error: 'Prompt exceeds maximum length of 1500 characters.' };
  }

  const rawLang = typeof record.preferredLanguage === 'string' ? record.preferredLanguage : 'bi';
  const preferredLanguage: 'en' | 'bn' | 'bi' =
    rawLang === 'en' || rawLang === 'bn' || rawLang === 'bi' ? rawLang : 'bi';

  const screenSummary =
    typeof record.screenSummary === 'string' && record.screenSummary.trim()
      ? record.screenSummary.trim().slice(0, 3000)
      : undefined;

  const installedAppNames = Array.isArray(record.installedAppNames)
    ? record.installedAppNames
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, 60)
    : [];

  return {
    ok: true,
    data: {
      prompt: rawPrompt,
      preferredLanguage,
      screenSummary,
      installedAppNames,
    },
  };
}
