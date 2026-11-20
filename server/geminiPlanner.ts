import { GoogleGenAI, Type } from '@google/genai';
import {
  validateActionPlan,
  type ActionPlan,
  type AllowedActionType,
} from '../src/shared/actionValidator';
import type { ValidatedInterpretInput } from './rateLimiter';

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

const SYSTEM_INSTRUCTION = `You are Sifat Agent, a bilingual (Bangla and English) Android AI personal assistant.
Convert the user's request into a structured JSON ActionPlan.

RULES:
1. Keep normal conversation ("intentType": "conversation", "steps": []) strictly separate from phone-control commands ("intentType": "phone_control").
2. Respond in Bangla ("bn") when the user writes in Bangla or Bengali script, or English ("en") when the user writes in English. Keep replies concise, helpful, and natural.
3. For phone control, ONLY use these allow-listed actions:
   - LAUNCH_APP (param: appName)
   - OPEN_SETTINGS (param: section in [general, wifi, bluetooth, display, sound, accessibility, apps, battery, privacy, locale])
   - GO_HOME
   - GO_BACK
   - READ_SCREEN
   - CLICK_ELEMENT (param: targetLabel)
   - SCROLL_SCREEN (param: direction in [up, down])
   - OPEN_URL (param: url starting with https://)
   - SET_BRIGHTNESS (param: levelPercent integer 5-100, requiresConfirmation: true)
   - DIAL_NUMBER (params: phoneNumber, optional contactName, requiresConfirmation: true)
   - COMPOSE_SMS (params: phoneNumber, messageBody, optional contactName, requiresConfirmation: true)
   - SHARE_CONTENT (param: text, requiresConfirmation: true)
4. If required details are missing (e.g. phone number for a call or SMS, or which app to open), return "intentType": "clarification", ask a clear clarifyingQuestion, and leave "steps": [].
5. NEVER invent actions outside the allow-list. Never bypass lock screens, permission dialogs, or banking protections. If asked to perform destructive or unauthorized actions, return "intentType": "blocked" and "steps": [].
6. If screenSummary is provided and the user asks about their screen, summarize the visible elements concisely and suggest a safe next action in suggestedNextAction.`;

const ACTION_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intentType: {
      type: Type.STRING,
      description: 'One of: conversation, phone_control, clarification, blocked',
    },
    replyText: {
      type: Type.STRING,
      description: 'Natural bilingual assistant response to speak/display to the user.',
    },
    replyLanguage: {
      type: Type.STRING,
      description: 'Language code of replyText: en or bn',
    },
    clarifyingQuestion: {
      type: Type.STRING,
      description: 'Optional follow-up question if the command is ambiguous or missing parameters.',
    },
    suggestedNextAction: {
      type: Type.STRING,
      description: 'Optional safe next step suggestion when summarizing a screen.',
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepId: { type: Type.STRING },
          action: { type: Type.STRING },
          description: { type: Type.STRING },
          requiresConfirmation: { type: Type.BOOLEAN },
          parametersList: {
            type: Type.ARRAY,
            description: 'Key-value parameter pairs for this action.',
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                value: { type: Type.STRING },
              },
              required: ['key', 'value'],
            },
          },
        },
        required: ['stepId', 'action', 'description', 'requiresConfirmation'],
      },
    },
  },
  required: ['intentType', 'replyText', 'replyLanguage', 'steps'],
};

interface RawGeminiStep {
  stepId?: string;
  action?: string;
  description?: string;
  requiresConfirmation?: boolean;
  parametersList?: Array<{ key: string; value: string }>;
}

interface RawGeminiPlan {
  intentType?: string;
  replyText?: string;
  replyLanguage?: string;
  clarifyingQuestion?: string;
  suggestedNextAction?: string;
  steps?: RawGeminiStep[];
}

export async function interpretWithGemini(input: ValidatedInterpretInput): Promise<{
  plan: ActionPlan;
  modelUsed: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the backend server. Add it in Settings > Secrets.'
    );
  }

  const contextLines = [
    `Preferred language setting: ${input.preferredLanguage}`,
    input.installedAppNames.length > 0
      ? `Installed Android apps: ${input.installedAppNames.join(', ')}`
      : null,
    input.screenSummary
      ? `User-authorized active screen text:\n${input.screenSummary}`
      : null,
    `User input: ${input.prompt}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  let response;
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: contextLines,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: ACTION_PLAN_SCHEMA,
        },
      });
      break;
    } catch (err) {
      lastError = err;
      const rawMsg = err instanceof Error ? err.message : String(err);
      const isTransient =
        rawMsg.includes('503') ||
        rawMsg.includes('429') ||
        rawMsg.includes('UNAVAILABLE') ||
        rawMsg.includes('RESOURCE_EXHAUSTED');
      if (!isTransient || attempt === maxAttempts) {
        let cleanMsg = rawMsg;
        try {
          const parsedErr = JSON.parse(rawMsg);
          if (parsedErr?.error?.message) {
            cleanMsg = parsedErr.error.message;
          }
        } catch {
          // Keep original string if not JSON
        }
        throw new Error(cleanMsg);
      }
      const backoffMs = 450 * attempt;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  if (!response) {
    throw lastError instanceof Error ? lastError : new Error('Gemini request failed.');
  }

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty response.');
  }

  const parsed = JSON.parse(rawText) as RawGeminiPlan;
  const intentType =
    parsed.intentType === 'phone_control' ||
    parsed.intentType === 'clarification' ||
    parsed.intentType === 'blocked'
      ? parsed.intentType
      : 'conversation';

  const normalizedPlan: ActionPlan = {
    intentType,
    replyText: parsed.replyText || 'Done.',
    replyLanguage: parsed.replyLanguage === 'bn' ? 'bn' : 'en',
    clarifyingQuestion: parsed.clarifyingQuestion ?? null,
    suggestedNextAction: parsed.suggestedNextAction ?? null,
    steps: (parsed.steps ?? []).map((s, idx) => {
      const params: Record<string, string> = {};
      for (const kv of s.parametersList ?? []) {
        if (kv.key) params[kv.key] = kv.value ?? '';
      }
      return {
        stepId: s.stepId || `step-${idx + 1}`,
        action: (s.action || 'UNSUPPORTED_OR_BLOCKED') as AllowedActionType,
        parameters: params,
        description: s.description || '',
        permissionRequirement: 'NONE',
        riskLevel: 'LOW',
        requiresConfirmation: Boolean(s.requiresConfirmation),
      };
    }),
  };

  const validated = validateActionPlan(normalizedPlan, input.prompt);
  return {
    plan: validated.validatedPlan,
    modelUsed: 'gemini-4-hydrogen',
  };
}
