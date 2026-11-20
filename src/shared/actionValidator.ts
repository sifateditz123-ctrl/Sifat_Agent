export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';

export type AllowedActionType =
  | 'CONVERSATION'
  | 'CLARIFY'
  | 'LAUNCH_APP'
  | 'OPEN_SETTINGS'
  | 'GO_HOME'
  | 'GO_BACK'
  | 'READ_SCREEN'
  | 'CLICK_ELEMENT'
  | 'SCROLL_SCREEN'
  | 'OPEN_URL'
  | 'SET_BRIGHTNESS'
  | 'DIAL_NUMBER'
  | 'COMPOSE_SMS'
  | 'SHARE_CONTENT'
  | 'UNSUPPORTED_OR_BLOCKED';

export interface ActionStep {
  stepId: string;
  action: AllowedActionType;
  parameters: Record<string, string>;
  description: string;
  permissionRequirement: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
}

export interface ActionPlan {
  intentType: 'conversation' | 'phone_control' | 'clarification' | 'blocked';
  replyText: string;
  replyLanguage: 'en' | 'bn';
  clarifyingQuestion?: string | null;
  steps: ActionStep[];
  suggestedNextAction?: string | null;
}

export interface ActionSpecification {
  action: AllowedActionType;
  label: string;
  permissionRequirement: string;
  riskLevel: RiskLevel;
  confirmationRequired: boolean;
  requiredParams: string[];
  optionalParams: string[];
  description: string;
}

export interface ValidationOutcome {
  isValid: boolean;
  validatedPlan: ActionPlan;
  rejectionReason?: string;
}

const ALLOWED_SETTINGS_SECTIONS = new Set([
  'general',
  'wifi',
  'bluetooth',
  'display',
  'sound',
  'accessibility',
  'apps',
  'battery',
  'privacy',
  'locale',
]);

const BLOCKED_KEYWORDS = [
  'bypass lock',
  'unlock screen',
  'pin code',
  'banking transfer',
  'send money',
  'bkash send',
  'nagad transfer',
  'delete all files',
  'wipe data',
  'factory reset',
  'grant permission automatically',
  'root shell',
  'su -c',
  'adb shell',
  'rm -rf',
];

export const ACTION_REGISTRY: Record<
  Exclude<AllowedActionType, 'UNSUPPORTED_OR_BLOCKED'>,
  ActionSpecification
> = {
  CONVERSATION: {
    action: 'CONVERSATION',
    label: 'Conversational Reply',
    permissionRequirement: 'NONE',
    riskLevel: 'LOW',
    confirmationRequired: false,
    requiredParams: [],
    optionalParams: [],
    description: 'Answers bilingual Bangla and English questions without device mutations.',
  },
  CLARIFY: {
    action: 'CLARIFY',
    label: 'Clarify Request',
    permissionRequirement: 'NONE',
    riskLevel: 'LOW',
    confirmationRequired: false,
    requiredParams: [],
    optionalParams: [],
    description: 'Asks a clarifying question when command intent or target is ambiguous.',
  },
  LAUNCH_APP: {
    action: 'LAUNCH_APP',
    label: 'Launch Installed App',
    permissionRequirement: 'QUERY_PACKAGES',
    riskLevel: 'LOW',
    confirmationRequired: false,
    requiredParams: ['appName'],
    optionalParams: [],
    description: 'Opens a user-installed application via PackageManager launcher intent.',
  },
  OPEN_SETTINGS: {
    action: 'OPEN_SETTINGS',
    label: 'Open Android Settings',
    permissionRequirement: 'NONE',
    riskLevel: 'LOW',
    confirmationRequired: false,
    requiredParams: [],
    optionalParams: ['section'],
    description: 'Opens a specific Android Settings page (Wi-Fi, Bluetooth, Accessibility, Display).',
  },
  GO_HOME: {
    action: 'GO_HOME',
    label: 'Go Home',
    permissionRequirement: 'ACCESSIBILITY_SERVICE',
    riskLevel: 'LOW',
    confirmationRequired: false,
    requiredParams: [],
    optionalParams: [],
    description: 'Triggers AccessibilityService GLOBAL_ACTION_HOME.',
  },
  GO_BACK: {
    action: 'GO_BACK',
    label: 'Go Back',
    permissionRequirement: 'ACCESSIBILITY_SERVICE',
    riskLevel: 'LOW',
    confirmationRequired: false,
    requiredParams: [],
    optionalParams: [],
    description: 'Triggers AccessibilityService GLOBAL_ACTION_BACK.',
  },
  READ_SCREEN: {
    action: 'READ_SCREEN',
    label: 'Read Visible Screen',
    permissionRequirement: 'ACCESSIBILITY_SERVICE',
    riskLevel: 'MEDIUM',
    confirmationRequired: false,
    requiredParams: [],
    optionalParams: [],
    description: 'Reads visible non-password accessibility tree nodes strictly on user request.',
  },
  CLICK_ELEMENT: {
    action: 'CLICK_ELEMENT',
    label: 'Tap Accessible Element',
    permissionRequirement: 'ACCESSIBILITY_SERVICE',
    riskLevel: 'MEDIUM',
    confirmationRequired: false,
    requiredParams: ['targetLabel'],
    optionalParams: [],
    description: 'Finds a visible UI element by accessible label and triggers ACTION_CLICK.',
  },
  SCROLL_SCREEN: {
    action: 'SCROLL_SCREEN',
    label: 'Scroll Visible Content',
    permissionRequirement: 'ACCESSIBILITY_SERVICE',
    riskLevel: 'LOW',
    confirmationRequired: false,
    requiredParams: [],
    optionalParams: ['direction'],
    description: 'Scrolls the active scrollable container up or down.',
  },
  OPEN_URL: {
    action: 'OPEN_URL',
    label: 'Open Web URL',
    permissionRequirement: 'NONE',
    riskLevel: 'MEDIUM',
    confirmationRequired: false,
    requiredParams: ['url'],
    optionalParams: [],
    description: 'Opens a validated http/https URL using ACTION_VIEW intent.',
  },
  SET_BRIGHTNESS: {
    action: 'SET_BRIGHTNESS',
    label: 'Adjust Screen Brightness',
    permissionRequirement: 'WRITE_SETTINGS',
    riskLevel: 'MEDIUM',
    confirmationRequired: true,
    requiredParams: ['levelPercent'],
    optionalParams: [],
    description: 'Adjusts manual brightness between 5% and 100% after user confirmation.',
  },
  DIAL_NUMBER: {
    action: 'DIAL_NUMBER',
    label: 'Dial Number Preview',
    permissionRequirement: 'INTENT_DIAL_ONLY',
    riskLevel: 'HIGH',
    confirmationRequired: true,
    requiredParams: ['phoneNumber'],
    optionalParams: ['contactName'],
    description: 'Opens ACTION_DIAL with pre-filled number after explicit preview confirmation.',
  },
  COMPOSE_SMS: {
    action: 'COMPOSE_SMS',
    label: 'Compose SMS Draft',
    permissionRequirement: 'INTENT_SENDTO_ONLY',
    riskLevel: 'HIGH',
    confirmationRequired: true,
    requiredParams: ['phoneNumber', 'messageBody'],
    optionalParams: ['contactName'],
    description: 'Opens ACTION_SENDTO SMS composer after explicit user preview confirmation.',
  },
  SHARE_CONTENT: {
    action: 'SHARE_CONTENT',
    label: 'Share Text Content',
    permissionRequirement: 'INTENT_SEND',
    riskLevel: 'HIGH',
    confirmationRequired: true,
    requiredParams: ['text'],
    optionalParams: [],
    description: 'Opens Android share chooser after user confirms shared payload.',
  },
};

export function containsBlockedIntent(rawInput: string): boolean {
  const lower = rawInput.toLowerCase();
  return BLOCKED_KEYWORDS.some((kw) => lower.includes(kw));
}

function sanitizeParameters(
  action: AllowedActionType,
  rawParams: Record<string, string> | undefined
): Record<string, string> | null {
  const params: Record<string, string> = { ...(rawParams ?? {}) };

  switch (action) {
    case 'OPEN_URL': {
      const rawUrl = (params.url ?? '').trim();
      if (!rawUrl) return null;
      const lower = rawUrl.toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('file:') || lower.startsWith('data:')) {
        return null;
      }
      const normalized =
        lower.startsWith('http://') || lower.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
      try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
        if (!parsed.hostname) return null;
        params.url = parsed.toString();
        return params;
      } catch {
        return null;
      }
    }

    case 'SET_BRIGHTNESS': {
      const level = Number.parseInt((params.levelPercent ?? '').trim(), 10);
      if (Number.isNaN(level) || level < 5 || level > 100) return null;
      params.levelPercent = String(level);
      return params;
    }

    case 'DIAL_NUMBER':
    case 'COMPOSE_SMS': {
      const phone = (params.phoneNumber ?? '').trim();
      const cleaned = phone.replace(/[^\d+]/g, '');
      if (cleaned.length < 3 || cleaned.length > 20) return null;
      params.phoneNumber = cleaned;
      return params;
    }

    case 'OPEN_SETTINGS': {
      const section = (params.section ?? 'general').toLowerCase().trim();
      params.section = ALLOWED_SETTINGS_SECTIONS.has(section) ? section : 'general';
      return params;
    }

    case 'SCROLL_SCREEN': {
      const dir = (params.direction ?? 'down').toLowerCase().trim();
      params.direction = dir === 'up' || dir === 'down' ? dir : 'down';
      return params;
    }

    default:
      return params;
  }
}

export function validateActionPlan(plan: ActionPlan, rawUserPrompt = ''): ValidationOutcome {
  if (containsBlockedIntent(rawUserPrompt)) {
    return {
      isValid: false,
      validatedPlan: {
        intentType: 'blocked',
        replyText:
          'For your security, Sifat Agent cannot bypass lock screens, permission dialogs, banking protections, or perform destructive actions.',
        replyLanguage: plan.replyLanguage === 'bn' ? 'bn' : 'en',
        steps: [],
      },
      rejectionReason: 'Blocked security-sensitive request',
    };
  }

  if (!plan.steps || plan.steps.length === 0) {
    return { isValid: true, validatedPlan: { ...plan, steps: [] } };
  }

  const validatedSteps: ActionStep[] = [];
  for (const step of plan.steps) {
    if (step.action === 'UNSUPPORTED_OR_BLOCKED') {
      return {
        isValid: false,
        validatedPlan: {
          ...plan,
          intentType: 'blocked',
          steps: [],
        },
        rejectionReason: 'Action is outside the allow-list',
      };
    }

    const spec = ACTION_REGISTRY[step.action];
    if (!spec) {
      return {
        isValid: false,
        validatedPlan: {
          ...plan,
          intentType: 'blocked',
          steps: [],
        },
        rejectionReason: `Unknown action type: ${step.action}`,
      };
    }

    for (const req of spec.requiredParams) {
      const val = step.parameters?.[req];
      if (!val || !val.trim()) {
        return {
          isValid: false,
          validatedPlan: {
            intentType: 'clarification',
            replyText: `I need a bit more detail before I can proceed (${req} is missing).`,
            replyLanguage: plan.replyLanguage === 'bn' ? 'bn' : 'en',
            clarifyingQuestion: `Please provide ${req} for ${step.action.toLowerCase().replace(/_/g, ' ')}.`,
            steps: [],
          },
          rejectionReason: `Missing required parameter: ${req}`,
        };
      }
    }

    const sanitized = sanitizeParameters(step.action, step.parameters);
    if (!sanitized) {
      return {
        isValid: false,
        validatedPlan: {
          intentType: 'blocked',
          replyText: 'Invalid or unsafe parameters were rejected by action validation.',
          replyLanguage: plan.replyLanguage === 'bn' ? 'bn' : 'en',
          steps: [],
        },
        rejectionReason: `Parameter validation failed for ${step.action}`,
      };
    }

    validatedSteps.push({
      stepId: step.stepId || `step-${validatedSteps.length + 1}`,
      action: step.action,
      parameters: sanitized,
      description: step.description || spec.label,
      permissionRequirement: spec.permissionRequirement,
      riskLevel: spec.riskLevel,
      requiresConfirmation: spec.confirmationRequired || Boolean(step.requiresConfirmation),
    });
  }

  return {
    isValid: true,
    validatedPlan: {
      ...plan,
      steps: validatedSteps,
    },
  };
}

export function tryLocalDeterministicParse(input: string): ActionPlan | null {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (containsBlockedIntent(lower)) {
    return {
      intentType: 'blocked',
      replyText: 'This operation is blocked by Sifat Agent security policy.',
      replyLanguage: 'en',
      steps: [],
    };
  }

  if (lower === 'go home' || lower === 'home screen' || trimmed.includes('হোম স্ক্রিনে যাও')) {
    return {
      intentType: 'phone_control',
      replyText: trimmed.includes('হোম')
        ? 'হোম স্ক্রিনে ফিরে যাচ্ছি।'
        : 'Navigating to the Home screen.',
      replyLanguage: trimmed.includes('হোম') ? 'bn' : 'en',
      steps: [
        {
          stepId: 'local-home',
          action: 'GO_HOME',
          parameters: {},
          description: 'Return to Android Home screen',
          permissionRequirement: 'ACCESSIBILITY_SERVICE',
          riskLevel: 'LOW',
          requiresConfirmation: false,
        },
      ],
    };
  }

  if (lower === 'go back' || lower === 'back' || trimmed.includes('পেছনে যাও')) {
    return {
      intentType: 'phone_control',
      replyText: trimmed.includes('পেছনে') ? 'পেছনে ফিরে যাচ্ছি।' : 'Performing Back navigation.',
      replyLanguage: trimmed.includes('পেছনে') ? 'bn' : 'en',
      steps: [
        {
          stepId: 'local-back',
          action: 'GO_BACK',
          parameters: {},
          description: 'Navigate Back',
          permissionRequirement: 'ACCESSIBILITY_SERVICE',
          riskLevel: 'LOW',
          requiresConfirmation: false,
        },
      ],
    };
  }

  if (
    lower === 'read screen' ||
    lower === 'what is on my screen' ||
    trimmed.includes('স্ক্রিন পড়ো')
  ) {
    return {
      intentType: 'phone_control',
      replyText: trimmed.includes('স্ক্রিন')
        ? 'অ্যাক্সেসিবিলিটি সার্ভিসের মাধ্যমে দৃশ্যমান স্ক্রিন পড়ছি।'
        : 'Reading visible screen content via Accessibility Service.',
      replyLanguage: trimmed.includes('স্ক্রিন') ? 'bn' : 'en',
      steps: [
        {
          stepId: 'local-read',
          action: 'READ_SCREEN',
          parameters: {},
          description: 'Read accessible text on active screen',
          permissionRequirement: 'ACCESSIBILITY_SERVICE',
          riskLevel: 'MEDIUM',
          requiresConfirmation: false,
        },
      ],
    };
  }

  return null;
}
