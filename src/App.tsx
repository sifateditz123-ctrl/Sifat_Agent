import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  tryLocalDeterministicParse,
  validateActionPlan,
  type ActionPlan,
  type ActionStep,
} from './shared/actionValidator';
import type {
  AssistantPermissions,
  AssistantSettingsState,
  ChatItem,
  HistoryItem,
  MobileScreenId,
  ProjectFileItem,
  SimulatedDeviceState,
  VoiceStage,
} from './types/assistant';
import { AndroidScreens } from './components/AndroidScreens';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ProjectExplorer } from './components/ProjectExplorer';

const STORAGE_SETTINGS_KEY = 'sifat_agent_settings_v1';
const STORAGE_HISTORY_KEY = 'sifat_agent_history_v1';

const DEFAULT_SETTINGS: AssistantSettingsState = {
  language: 'bi',
  theme: 'dark',
  ttsEnabled: true,
  speechRate: 1.0,
  wakeWordEnabled: false,
  automationMasterSwitch: true,
  screenSummaryConsent: true,
};

const INITIAL_DEVICE_STATE: SimulatedDeviceState = {
  currentApp: 'Sifat Agent Launcher',
  brightnessPercent: 72,
  lastDialPreview: null,
  lastSmsDraft: null,
  lastOpenedUrl: null,
  scrollPosition: 0,
  installedApps: ['YouTube', 'WhatsApp', 'Chrome', 'Camera', 'Messages', 'Settings', 'Calendar'],
  visibleScreenNodes: [
    { label: 'Sifat Agent Home', type: 'TextView', clickable: false },
    { label: 'Tap to Talk Microphone', type: 'Button', clickable: true },
    { label: 'Quick Command: Open YouTube', type: 'Button', clickable: true },
    { label: 'Account PIN Input', type: 'EditText', clickable: true, sensitive: true },
  ],
};

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [workspaceTab, setWorkspaceTab] = useState<'assistant' | 'project'>('assistant');
  const [activeScreen, setActiveScreen] = useState<MobileScreenId>(autostart ? 'home' : 'splash');

  const [settings, setSettings] = useState<AssistantSettingsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [permissions, setPermissions] = useState<AssistantPermissions>({
    microphone: true,
    accessibilityEnabled: true,
    writeSettings: true,
    notifications: true,
  });

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [voiceStage, setVoiceStage] = useState<VoiceStage>('IDLE');
  const [micLevel, setMicLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [activeProgress, setActiveProgress] = useState<string | null>(null);

  const [deviceState, setDeviceState] = useState<SimulatedDeviceState>(INITIAL_DEVICE_STATE);
  const [lastPlan, setLastPlan] = useState<ActionPlan | null>(null);
  const [pendingStepQueue, setPendingStepQueue] = useState<{
    current: ActionStep;
    remaining: ActionStep[];
    prompt: string;
    plan: ActionPlan;
  } | null>(null);

  const [projectFiles, setProjectFiles] = useState<ProjectFileItem[]>([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const sessionTokenRef = useRef<{ token: string; expiresAt: number } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Sync dark/light mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota issues
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(historyItems));
    } catch {
      // Ignore storage quota issues
    }
  }, [historyItems]);

  // Load real Android Studio project files from backend
  useEffect(() => {
    let cancelled = false;
    fetch('/api/android-project')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setProjectFiles(data.files ?? []);
          setProjectLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProjectError(err instanceof Error ? err.message : 'Unable to load Android files.');
          setProjectLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getSessionToken = async (): Promise<string> => {
    const cached = sessionTokenRef.current;
    if (cached && Date.now() < cached.expiresAt - 30_000) {
      return cached.token;
    }
    const res = await fetch('/api/auth/session', { method: 'POST' });
    if (!res.ok) {
      throw new Error('Could not establish authenticated session with backend.');
    }
    const data = (await res.json()) as { token: string; expiresAtEpochMs: number };
    sessionTokenRef.current = { token: data.token, expiresAt: data.expiresAtEpochMs };
    return data.token;
  };

  const speakReply = (text: string, lang: 'en' | 'bn') => {
    if (!settings.ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      utterance.rate = settings.speechRate;
      utterance.onstart = () => setVoiceStage('SPEAKING');
      utterance.onend = () => setVoiceStage('IDLE');
      utterance.onerror = () => setVoiceStage('IDLE');
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore TTS synthesis errors in headless browsers
    }
  };

  const appendChat = (
    role: ChatItem['role'],
    text: string,
    language: 'en' | 'bn',
    plan?: ActionPlan
  ) => {
    setChatItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        text,
        language,
        timestamp: Date.now(),
        plan,
      },
    ]);
  };

  const recordHistory = (
    commandText: string,
    intentType: string,
    actionSummary: string,
    status: string
  ) => {
    setHistoryItems((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        commandText,
        intentType,
        actionSummary,
        status,
        timestamp: Date.now(),
      },
      ...prev,
    ]);
  };

  const executeSingleStep = (step: ActionStep): { success: boolean; message: string } => {
    const needsAccessibility = ['GO_HOME', 'GO_BACK', 'READ_SCREEN', 'CLICK_ELEMENT', 'SCROLL_SCREEN'].includes(
      step.action
    );
    if (needsAccessibility) {
      if (!settings.automationMasterSwitch) {
        return { success: false, message: 'Automation master switch is disabled in Settings.' };
      }
      if (!permissions.accessibilityEnabled) {
        return {
          success: false,
          message: 'Sifat Accessibility Service is not enabled in Permission Setup.',
        };
      }
    }

    switch (step.action) {
      case 'LAUNCH_APP': {
        const appName = step.parameters.appName || 'App';
        const match = deviceState.installedApps.find(
          (a) => a.toLowerCase() === appName.toLowerCase() || a.toLowerCase().includes(appName.toLowerCase())
        );
        if (!match) {
          return { success: false, message: `App '${appName}' is not installed on this device.` };
        }
        setDeviceState((d) => ({
          ...d,
          currentApp: match,
          visibleScreenNodes: [
            { label: `${match} Main Feed`, type: 'TextView', clickable: false },
            { label: 'Search', type: 'Button', clickable: true },
            { label: 'Back', type: 'Button', clickable: true },
          ],
        }));
        return { success: true, message: `Launched ${match}.` };
      }
      case 'OPEN_SETTINGS': {
        const section = step.parameters.section || 'general';
        setDeviceState((d) => ({
          ...d,
          currentApp: `Android Settings (${section})`,
          visibleScreenNodes: [
            { label: `Settings · ${section}`, type: 'TextView', clickable: false },
            { label: 'Toggle Setting', type: 'Switch', clickable: true },
          ],
        }));
        return { success: true, message: `Opened Android ${section} settings.` };
      }
      case 'GO_HOME':
        setDeviceState((d) => ({
          ...d,
          currentApp: 'Sifat Agent Launcher',
          visibleScreenNodes: INITIAL_DEVICE_STATE.visibleScreenNodes,
        }));
        return { success: true, message: 'Navigated to Android Home screen.' };
      case 'GO_BACK':
        return { success: true, message: 'Performed Accessibility Back navigation.' };
      case 'READ_SCREEN': {
        const nonSensitive = deviceState.visibleScreenNodes.filter((n) => !n.sensitive);
        const redactedCount = deviceState.visibleScreenNodes.filter((n) => n.sensitive).length;
        return {
          success: true,
          message: `Read ${nonSensitive.length} visible nodes (${redactedCount} password field redacted): ${nonSensitive
            .map((n) => n.label)
            .join(' | ')}`,
        };
      }
      case 'CLICK_ELEMENT': {
        const target = step.parameters.targetLabel || '';
        const found = deviceState.visibleScreenNodes.find(
          (n) => !n.sensitive && n.label.toLowerCase().includes(target.toLowerCase())
        );
        if (!found) {
          return { success: false, message: `Visible element '${target}' not found on screen.` };
        }
        return { success: true, message: `Tapped accessible element '${found.label}'.` };
      }
      case 'SCROLL_SCREEN': {
        const dir = step.parameters.direction === 'up' ? -120 : 120;
        setDeviceState((d) => ({ ...d, scrollPosition: Math.max(0, d.scrollPosition + dir) }));
        return { success: true, message: `Scrolled screen ${step.parameters.direction || 'down'}.` };
      }
      case 'OPEN_URL':
        setDeviceState((d) => ({
          ...d,
          currentApp: 'Chrome',
          lastOpenedUrl: step.parameters.url || null,
        }));
        return { success: true, message: `Opened URL intent: ${step.parameters.url}` };
      case 'SET_BRIGHTNESS': {
        if (!permissions.writeSettings) {
          return { success: false, message: 'WRITE_SETTINGS permission is not granted.' };
        }
        const pct = Number.parseInt(step.parameters.levelPercent || '70', 10);
        setDeviceState((d) => ({ ...d, brightnessPercent: pct }));
        return { success: true, message: `Adjusted screen brightness to ${pct}%.` };
      }
      case 'DIAL_NUMBER':
        setDeviceState((d) => ({ ...d, lastDialPreview: step.parameters.phoneNumber || null }));
        return {
          success: true,
          message: `Opened ACTION_DIAL preview for ${step.parameters.phoneNumber}.`,
        };
      case 'COMPOSE_SMS':
        setDeviceState((d) => ({
          ...d,
          lastSmsDraft: {
            phoneNumber: step.parameters.phoneNumber || '',
            messageBody: step.parameters.messageBody || '',
          },
        }));
        return {
          success: true,
          message: `Opened ACTION_SENDTO SMS composer to ${step.parameters.phoneNumber}.`,
        };
      case 'SHARE_CONTENT':
        return {
          success: true,
          message: `Opened Android Share sheet for: "${step.parameters.text}"`,
        };
      default:
        return { success: false, message: 'Action is outside the allow-list.' };
    }
  };

  const runStepQueue = (steps: ActionStep[], prompt: string, plan: ActionPlan) => {
    if (steps.length === 0) {
      setActiveProgress(null);
      setVoiceStage('IDLE');
      return;
    }
    const [current, ...remaining] = steps;
    if (current.requiresConfirmation) {
      setActiveProgress(`Awaiting confirmation for ${current.action}`);
      setPendingStepQueue({ current, remaining, prompt, plan });
      return;
    }

    setActiveProgress(`Running ${current.action}...`);
    const result = executeSingleStep(current);
    appendChat('system', result.message, plan.replyLanguage);
    recordHistory(
      prompt,
      plan.intentType,
      `${current.action}: ${result.message}`,
      result.success ? 'Executed' : 'Denied/Failed'
    );
    if (result.success && remaining.length > 0) {
      runStepQueue(remaining, prompt, plan);
    } else {
      setActiveProgress(null);
      setVoiceStage('IDLE');
    }
  };

  const handleSubmitCommand = async (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt) return;

    const langGuess: 'en' | 'bn' = /[\u0980-\u09FF]/.test(prompt) ? 'bn' : 'en';
    appendChat('user', prompt, langGuess);
    setVoiceStage('PROCESSING');
    setActiveProgress('Interpreting command...');
    setVoiceError(null);

    try {
      let rawPlan = tryLocalDeterministicParse(prompt);

      if (!rawPlan) {
        const token = await getSessionToken();
        const screenSummary = settings.screenSummaryConsent
          ? deviceState.visibleScreenNodes
              .filter((n) => !n.sensitive)
              .map((n) => `${n.label} (${n.type}${n.clickable ? ', clickable' : ''})`)
              .join('\n')
          : undefined;

        const res = await fetch('/api/agent/interpret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt,
            preferredLanguage: settings.language,
            screenSummary,
            installedAppNames: deviceState.installedApps,
          }),
        });

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || `Backend error (${res.status})`);
        }
        rawPlan = payload.plan as ActionPlan;
      }

      const validation = validateActionPlan(rawPlan, prompt);
      const validatedPlan = validation.validatedPlan;
      setLastPlan(validatedPlan);

      if (validatedPlan.replyText) {
        appendChat('assistant', validatedPlan.replyText, validatedPlan.replyLanguage, validatedPlan);
        speakReply(validatedPlan.replyText, validatedPlan.replyLanguage);
      }

      if (validatedPlan.steps.length === 0) {
        recordHistory(
          prompt,
          validatedPlan.intentType,
          validatedPlan.replyText.slice(0, 120),
          validation.isValid ? 'Completed' : 'Blocked'
        );
        setActiveProgress(null);
        setVoiceStage('IDLE');
      } else {
        runStepQueue(validatedPlan.steps, prompt, validatedPlan);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach Gemini backend.';
      appendChat('system', msg, 'en');
      recordHistory(prompt, 'error', msg, 'Failed');
      setVoiceError(msg);
      setActiveProgress(null);
      setVoiceStage('ERROR');
    }
  };

  const handleConfirmPending = () => {
    if (!pendingStepQueue) return;
    const { current, remaining, prompt, plan } = pendingStepQueue;
    setPendingStepQueue(null);
    const result = executeSingleStep(current);
    appendChat('system', result.message, plan.replyLanguage);
    recordHistory(
      prompt,
      plan.intentType,
      `${current.action}: ${result.message}`,
      result.success ? 'Confirmed & Executed' : 'Failed'
    );
    runStepQueue(remaining, prompt, plan);
  };

  const handleCancelPending = () => {
    if (!pendingStepQueue) return;
    const { current, prompt, plan } = pendingStepQueue;
    setPendingStepQueue(null);
    setActiveProgress(null);
    setVoiceStage('IDLE');
    appendChat('system', 'Action cancelled by user.', 'en');
    recordHistory(prompt, plan.intentType, `${current.action} cancelled`, 'Cancelled');
  };

  const handleStartVoice = () => {
    if (!permissions.microphone) {
      setVoiceStage('ERROR');
      setVoiceError('Microphone permission is disabled in Permission Setup.');
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceStage('ERROR');
      setVoiceError(
        'Browser Web Speech recognition is unavailable here. Use Chat or Quick Prompts to test Gemini commands.'
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      recognitionRef.current = rec;
      rec.lang = settings.language === 'en' ? 'en-US' : 'bn-BD';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      setVoiceError(null);
      setLiveTranscript('');
      setVoiceStage('LISTENING');
      setMicLevel(0.65);

      let latest = '';
      rec.onresult = (event) => {
        const res = event.results[event.results.length - 1];
        if (res && res[0]) {
          latest = res[0].transcript;
          setLiveTranscript(latest);
        }
      };
      rec.onerror = (event) => {
        setVoiceStage('ERROR');
        setMicLevel(0);
        setVoiceError(`Speech recognition error: ${event.error}`);
      };
      rec.onend = () => {
        setMicLevel(0);
        if (latest.trim()) {
          setActiveScreen('chat');
          handleSubmitCommand(latest.trim());
        } else {
          setVoiceStage((prev) => (prev === 'LISTENING' ? 'IDLE' : prev));
        }
      };
      rec.start();
    } catch {
      setVoiceStage('ERROR');
      setVoiceError('Could not initialize speech recognition in this browser.');
    }
  };

  const handleStopVoice = () => {
    recognitionRef.current?.stop();
    setMicLevel(0);
    setVoiceStage('IDLE');
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceStage('IDLE');
  };

  const handleDownloadZip = async () => {
    if (projectFiles.length === 0) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (const file of projectFiles) {
        zip.file(file.path, file.content);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sifat-agent-android-project.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-[#0B1120] dark:bg-[#070B14] dark:text-[#F1F5F9] transition-colors">
      {pendingStepQueue && (
        <ConfirmationModal
          step={pendingStepQueue.current}
          onApprove={handleConfirmPending}
          onCancel={handleCancelPending}
        />
      )}

      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-[#070B14]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setWorkspaceTab('assistant');
              setActiveScreen('home');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            Sifat Agent
          </a>

          <nav aria-label="Primary sections" className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setWorkspaceTab('assistant');
                setActiveScreen('home');
              }}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                workspaceTab === 'assistant' && activeScreen !== 'automation' && activeScreen !== 'permissions'
                  ? 'border-blue-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Assistant
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceTab('assistant');
                setActiveScreen('automation');
              }}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                workspaceTab === 'assistant' && activeScreen === 'automation'
                  ? 'border-blue-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Automation
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceTab('assistant');
                setActiveScreen('permissions');
              }}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                workspaceTab === 'assistant' && activeScreen === 'permissions'
                  ? 'border-blue-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Permissions
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceTab('project')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                workspaceTab === 'project'
                  ? 'border-blue-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Project Source
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip || projectFiles.length === 0}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              {downloadingZip ? 'Exporting...' : 'Download Android ZIP'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile View Switcher (below header on small screens) */}
      <div className="md:hidden border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto bg-white dark:bg-[#0B1120]">
        <button
          type="button"
          onClick={() => {
            setWorkspaceTab('assistant');
            setActiveScreen('home');
          }}
          className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
            workspaceTab === 'assistant'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          Assistant App
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceTab('project')}
          className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
            workspaceTab === 'project'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          Project Source ({projectFiles.length})
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {workspaceTab === 'project' ? (
          <ProjectExplorer
            files={projectFiles}
            loading={projectLoading}
            error={projectError}
            onDownloadZip={handleDownloadZip}
            downloadingZip={downloadingZip}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Android Screen Simulator */}
            <section aria-label="Interactive Sifat Agent Android App" className="lg:col-span-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Interactive Android Experience
                </h1>
                <div className="flex items-center gap-1.5 text-xs">
                  {(
                    [
                      { id: 'splash', label: 'Splash' },
                      { id: 'voice', label: 'Voice' },
                      { id: 'permissions', label: 'Perms' },
                      { id: 'privacy', label: 'Privacy' },
                    ] as const
                  ).map((shortcut) => (
                    <button
                      key={shortcut.id}
                      type="button"
                      onClick={() => setActiveScreen(shortcut.id)}
                      className={`px-2.5 py-1 min-h-[32px] rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        activeScreen === shortcut.id
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {shortcut.label}
                    </button>
                  ))}
                </div>
              </div>

              <AndroidScreens
                activeScreen={activeScreen}
                onNavigate={setActiveScreen}
                voiceStage={voiceStage}
                micLevel={micLevel}
                liveTranscript={liveTranscript}
                voiceError={voiceError}
                activeProgress={activeProgress}
                onStartVoice={handleStartVoice}
                onStopVoice={handleStopVoice}
                onStopSpeaking={handleStopSpeaking}
                onSubmitCommand={handleSubmitCommand}
                chatItems={chatItems}
                onClearChat={() => setChatItems([])}
                historyItems={historyItems}
                onDeleteHistory={(id) =>
                  setHistoryItems((prev) => prev.filter((item) => item.id !== id))
                }
                onClearHistory={() => setHistoryItems([])}
                settings={settings}
                onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
                permissions={permissions}
                onTogglePermission={(key) =>
                  setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                deviceState={deviceState}
                lastPlan={lastPlan}
              />
            </section>

            {/* Right Column: Live Device Context, Action Plan & Build Transparency */}
            <aside className="lg:col-span-6 space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1525] p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Simulated Android Device State
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    API 26–35 · Kotlin + Compose
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151F35] p-3">
                    <dt className="text-slate-500 dark:text-slate-400">Foreground App</dt>
                    <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {deviceState.currentApp}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151F35] p-3">
                    <dt className="text-slate-500 dark:text-slate-400">Screen Brightness</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {deviceState.brightnessPercent}%
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151F35] p-3">
                    <dt className="text-slate-500 dark:text-slate-400">Last Dialer Preview</dt>
                    <dd className="mt-1 font-mono text-slate-900 dark:text-slate-100 truncate">
                      {deviceState.lastDialPreview ?? 'None'}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151F35] p-3">
                    <dt className="text-slate-500 dark:text-slate-400">Last SMS Draft</dt>
                    <dd className="mt-1 text-slate-900 dark:text-slate-100 truncate">
                      {deviceState.lastSmsDraft
                        ? `${deviceState.lastSmsDraft.phoneNumber}: ${deviceState.lastSmsDraft.messageBody}`
                        : 'None'}
                    </dd>
                  </div>
                </dl>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Active Accessibility Tree (Password Fields Redacted)
                  </div>
                  <div className="space-y-1.5">
                    {deviceState.visibleScreenNodes.map((node, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#070B14] border border-slate-200/70 dark:border-slate-800/80"
                      >
                        <span className="text-slate-800 dark:text-slate-200">
                          {node.sensitive ? '[REDACTED PASSWORD FIELD]' : node.label}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {node.type}
                          {node.clickable ? ' · clickable' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1525] p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Validated ActionPlan JSON
                  </h2>
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab('project')}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    Inspect Kotlin Source
                  </button>
                </div>
                {lastPlan ? (
                  <pre className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto max-h-60">
                    {JSON.stringify(lastPlan, null, 2)}
                  </pre>
                ) : (
                  <p className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Run any bilingual command (for example, "Open YouTube" or "রহিমকে মেসেজ পাঠাও") to inspect the validated Gemini JSON action plan here.
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
