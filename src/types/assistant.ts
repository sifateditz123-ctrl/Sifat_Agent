import type { ActionPlan } from '../shared/actionValidator';

export type AssistantLanguage = 'en' | 'bn' | 'bi';
export type VoiceStage = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';
export type MobileScreenId =
  | 'splash'
  | 'home'
  | 'chat'
  | 'voice'
  | 'automation'
  | 'permissions'
  | 'settings'
  | 'history'
  | 'privacy';

export interface ChatItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  language: 'en' | 'bn';
  timestamp: number;
  plan?: ActionPlan;
}

export interface HistoryItem {
  id: string;
  commandText: string;
  intentType: string;
  actionSummary: string;
  status: string;
  timestamp: number;
}

export interface SimulatedDeviceState {
  currentApp: string;
  brightnessPercent: number;
  lastDialPreview: string | null;
  lastSmsDraft: { phoneNumber: string; messageBody: string } | null;
  lastOpenedUrl: string | null;
  scrollPosition: number;
  installedApps: string[];
  visibleScreenNodes: Array<{
    label: string;
    type: string;
    clickable: boolean;
    sensitive?: boolean;
  }>;
}

export interface AssistantPermissions {
  microphone: boolean;
  accessibilityEnabled: boolean;
  writeSettings: boolean;
  notifications: boolean;
}

export interface AssistantSettingsState {
  language: AssistantLanguage;
  theme: 'dark' | 'light';
  ttsEnabled: boolean;
  speechRate: number;
  wakeWordEnabled: boolean;
  automationMasterSwitch: boolean;
  screenSummaryConsent: boolean;
}

export interface ProjectFileItem {
  path: string;
  category:
    | 'gradle'
    | 'manifest'
    | 'kotlin-core'
    | 'kotlin-ui'
    | 'resources'
    | 'tests'
    | 'backend'
    | 'docs';
  language: string;
  content: string;
  lineCount: number;
}
