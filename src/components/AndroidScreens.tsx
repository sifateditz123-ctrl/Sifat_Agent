import { useState } from 'react';
import {
  ArrowLeft,
  Bolt,
  CheckCircle2,
  Eye,
  History,
  Home,
  MessageSquare,
  Mic,
  Send,
  Settings,
  ShieldCheck,
  Square,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react';
import { ACTION_REGISTRY, type ActionPlan } from '../shared/actionValidator';
import type {
  AssistantLanguage,
  AssistantPermissions,
  AssistantSettingsState,
  ChatItem,
  HistoryItem,
  MobileScreenId,
  SimulatedDeviceState,
  VoiceStage,
} from '../types/assistant';
import { AiOrbCanvas, VoiceWaveformBars } from './AiOrbCanvas';

interface AndroidScreensProps {
  activeScreen: MobileScreenId;
  onNavigate: (screen: MobileScreenId) => void;
  voiceStage: VoiceStage;
  micLevel: number;
  liveTranscript: string;
  voiceError: string | null;
  activeProgress: string | null;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onStopSpeaking: () => void;
  onSubmitCommand: (text: string) => void;
  chatItems: ChatItem[];
  onClearChat: () => void;
  historyItems: HistoryItem[];
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
  settings: AssistantSettingsState;
  onUpdateSettings: (patch: Partial<AssistantSettingsState>) => void;
  permissions: AssistantPermissions;
  onTogglePermission: (key: keyof AssistantPermissions) => void;
  deviceState: SimulatedDeviceState;
  lastPlan: ActionPlan | null;
}

const QUICK_PROMPTS = [
  'Open YouTube',
  'ফোন সেটিংস খোলো',
  'Read screen',
  'SMS +8801711000000: Meeting at 4 PM',
  'বাংলাদেশে প্রযুক্তি খাতের সুযোগ কী?',
];

export function AndroidScreens(props: AndroidScreensProps) {
  const {
    activeScreen,
    onNavigate,
    voiceStage,
    micLevel,
    liveTranscript,
    voiceError,
    activeProgress,
    onStartVoice,
    onStopVoice,
    onStopSpeaking,
    onSubmitCommand,
    chatItems,
    onClearChat,
    historyItems,
    onDeleteHistory,
    onClearHistory,
    settings,
    onUpdateSettings,
    permissions,
    onTogglePermission,
    deviceState,
  } = props;

  const [chatInput, setChatInput] = useState('');
  const [historyFilter, setHistoryFilter] = useState('');

  const isBn = settings.language === 'bn';

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    onSubmitCommand(text);
  };

  if (activeScreen === 'splash') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[580px] p-8 text-center bg-gradient-to-b from-slate-100 via-blue-50/40 to-slate-100 dark:from-[#070B14] dark:via-[#0D1629] dark:to-[#070B14] rounded-2xl">
        <AiOrbCanvas stage="IDLE" micLevel={0} size={156} />
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Sifat Agent
        </h2>
        <p className="mt-2 text-sm text-violet-600 dark:text-violet-400 font-medium">
          বাংলা & English Personal AI Assistant
        </p>
        <p className="mt-3 max-w-xs text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Voice-controlled Android assistant with allow-listed safety validation and secure Gemini proxy.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mt-8 px-6 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors"
        >
          Enter Assistant
        </button>
      </div>
    );
  }

  const showBottomTabs = ['home', 'chat', 'automation', 'history', 'settings'].includes(activeScreen);

  return (
    <div className="flex flex-col min-h-[560px] lg:h-[670px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] overflow-hidden">
      {/* Compact Android Top Bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#0E1525]">
        <div className="flex items-center gap-2 min-w-0">
          {(activeScreen === 'voice' || activeScreen === 'permissions' || activeScreen === 'privacy') && (
            <button
              type="button"
              onClick={() => onNavigate(activeScreen === 'privacy' ? 'permissions' : 'home')}
              aria-label="Back to previous screen"
              className="p-2 min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {activeScreen === 'home' && (isBn ? 'সিফাত এজেন্ট' : 'Sifat Agent')}
            {activeScreen === 'chat' && (isBn ? 'কথোপকথন' : 'Assistant Chat')}
            {activeScreen === 'voice' && (isBn ? 'ভয়েস অ্যাসিস্ট্যান্ট' : 'Voice Assistant')}
            {activeScreen === 'automation' && (isBn ? 'নিরাপদ অটোমেশন' : 'Safe Automation')}
            {activeScreen === 'permissions' && (isBn ? 'অনুমতি সেটআপ' : 'Permission Setup')}
            {activeScreen === 'settings' && (isBn ? 'সেটিংস' : 'Settings')}
            {activeScreen === 'history' && (isBn ? 'কমান্ড ইতিহাস' : 'Command History')}
            {activeScreen === 'privacy' && (isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy')}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('permissions')}
          className="px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          Permissions
        </button>
      </div>

      {/* Screen Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {activeScreen === 'home' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>
                {settings.language === 'bn'
                  ? 'বাংলা'
                  : settings.language === 'en'
                  ? 'English'
                  : 'বাংলা + English'}
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>
                Automation {settings.automationMasterSwitch ? 'Enabled' : 'Paused'}
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>App: {deviceState.currentApp}</span>
            </div>

            <AiOrbCanvas stage={voiceStage} micLevel={micLevel} size={144} />

            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
              {activeProgress ||
                (isBn
                  ? 'বাংলা বা ইংরেজিতে কথা বলতে মাইক্রোফোন ট্যাপ করুন'
                  : 'Tap the microphone to speak or choose a bilingual command below.')}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onNavigate('voice');
                  onStartVoice();
                }}
                aria-label="Tap to talk"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 transition-transform active:scale-95"
              >
                <Mic className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('chat')}
                className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Type Command
              </button>
            </div>

            <div className="w-full pt-2 border-t border-slate-200 dark:border-slate-800 text-left space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Quick Bilingual Prompts
              </h3>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      onNavigate('chat');
                      onSubmitCommand(prompt);
                    }}
                    className="px-3 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#151F35] hover:border-blue-500/60 text-xs font-medium text-slate-800 dark:text-slate-200 text-left transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'voice' && (
          <div className="flex flex-col items-center justify-between min-h-[460px] text-center py-4 space-y-6">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>Locale: {settings.language === 'en' ? 'en-US' : 'bn-BD'}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>
                {settings.wakeWordEnabled ? 'Wake-Word Notice Active' : 'Tap-to-Talk Only'}
              </span>
            </div>

            <AiOrbCanvas stage={voiceStage} micLevel={micLevel} size={184} />

            <div className="space-y-3 w-full max-w-sm">
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {voiceStage === 'LISTENING' && 'Listening...'}
                {voiceStage === 'PROCESSING' && 'Processing with Gemini...'}
                {voiceStage === 'SPEAKING' && 'Speaking Reply...'}
                {voiceStage === 'ERROR' && 'Speech Recognition Unavailable'}
                {voiceStage === 'IDLE' && 'Voice Ready'}
              </div>

              <VoiceWaveformBars
                active={voiceStage === 'LISTENING' || voiceStage === 'SPEAKING'}
                level={micLevel}
              />

              <p className="text-sm text-slate-600 dark:text-slate-300 min-h-[44px]">
                {voiceError
                  ? voiceError
                  : liveTranscript ||
                    'Speak in Bangla or English, or type a command in Chat if your browser has no speech service.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {voiceStage === 'LISTENING' ? (
                <button
                  type="button"
                  onClick={onStopVoice}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Listening</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartVoice}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Listening</span>
                </button>
              )}

              {voiceStage === 'SPEAKING' && (
                <button
                  type="button"
                  onClick={onStopSpeaking}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Mute
                </button>
              )}
            </div>
          </div>
        )}

        {activeScreen === 'chat' && (
          <div className="flex flex-col h-full min-h-[470px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {chatItems.length} messages · Gemini Backend
              </span>
              {chatItems.length > 0 && (
                <button
                  type="button"
                  onClick={onClearChat}
                  className="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors"
                >
                  Clear Chat
                </button>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {chatItems.length === 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151F35] p-4 text-sm text-slate-600 dark:text-slate-300">
                  Ask a question in Bangla or English, or issue a safe phone command such as{' '}
                  <span className="font-medium text-slate-900 dark:text-white">"Open YouTube"</span>,{' '}
                  <span className="font-medium text-slate-900 dark:text-white">"ফোন সেটিংস খোলো"</span>, or{' '}
                  <span className="font-medium text-slate-900 dark:text-white">"Read screen"</span>.
                </div>
              )}

              {chatItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm border ${
                      item.role === 'user'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : item.role === 'system'
                        ? 'bg-slate-100 dark:bg-[#151F35] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                        : 'bg-white dark:bg-[#0E1525] text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="text-[11px] opacity-75 mb-0.5">
                      {item.role === 'user' ? 'You' : item.role === 'system' ? 'Execution' : 'Sifat Agent'}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{item.text}</p>
                    {item.plan?.clarifyingQuestion && (
                      <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-300">
                        {item.plan.clarifyingQuestion}
                      </p>
                    )}
                    {item.plan?.suggestedNextAction && (
                      <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400">
                        Suggested next: {item.plan.suggestedNextAction}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {activeProgress && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                {activeProgress}
              </div>
            )}

            <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
              <label htmlFor="sifat-chat-input" className="sr-only">
                Command or message in Bangla or English
              </label>
              <input
                id="sifat-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type in বাংলা or English..."
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0E1525] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {activeScreen === 'automation' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E1525] p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Automation Master Switch
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {permissions.accessibilityEnabled
                    ? 'Accessibility Service enabled'
                    : 'Accessibility Service off — tap Permissions to enable'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.automationMasterSwitch}
                aria-label="Toggle automation master switch"
                onClick={() =>
                  onUpdateSettings({ automationMasterSwitch: !settings.automationMasterSwitch })
                }
                className={`px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                  settings.automationMasterSwitch
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {settings.automationMasterSwitch ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSubmitCommand('read screen')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Test Read Screen</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('permissions')}
                className="px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                Manage Permissions
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Allow-Listed Android Actions
              </h3>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {Object.values(ACTION_REGISTRY).map((spec) => (
                  <div
                    key={spec.action}
                    className="p-3 bg-white dark:bg-[#0E1525] flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {spec.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {spec.description}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        Risk: {spec.riskLevel} · Perm: {spec.permissionRequirement} ·{' '}
                        {spec.confirmationRequired ? 'Confirmation Required' : 'Direct'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeScreen === 'permissions' && (
          <div className="space-y-3">
            {[
              {
                key: 'microphone' as const,
                title: 'Microphone (RECORD_AUDIO)',
                desc: 'Used strictly on tap-to-talk or explicit opt-in Wake-Word foreground service.',
              },
              {
                key: 'accessibilityEnabled' as const,
                title: 'Accessibility Service (Manual Enable)',
                desc: 'Reads visible non-password UI nodes and executes Go Home / Back / Scroll / Tap only when asked.',
              },
              {
                key: 'writeSettings' as const,
                title: 'Modify System Settings (WRITE_SETTINGS)',
                desc: 'Required by Android only when adjusting manual screen brightness.',
              },
              {
                key: 'notifications' as const,
                title: 'Notifications (POST_NOTIFICATIONS)',
                desc: 'Shows a persistent visible notice whenever the Wake-Word listener is active.',
              },
            ].map((item) => {
              const granted = permissions[item.key];
              return (
                <div
                  key={item.key}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E1525] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        granted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {granted ? 'Granted' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                  <button
                    type="button"
                    onClick={() => onTogglePermission(item.key)}
                    className="px-3.5 py-2 min-h-[40px] rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
                  >
                    {granted ? 'Revoke in Simulator' : 'Grant in Simulator'}
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className="w-full py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              View Privacy & Security Policy
            </button>
          </div>
        )}

        {activeScreen === 'privacy' && (
          <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>Sifat Agent Privacy Commitments</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">1. Voice & Microphone</h3>
              <p className="mt-1">
                Audio is never captured silently in the background. Wake-word mode requires explicit opt-in and runs a visible foreground notification.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">2. Accessibility & Screen Reading</h3>
              <p className="mt-1">
                Screen nodes are inspected strictly on your command. Password fields (isPassword) are automatically redacted and never stored or sent to the backend.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">3. Backend Security</h3>
              <p className="mt-1">
                All Gemini requests traverse an HTTPS proxy with Bearer session authentication and rate limiting. No API keys exist inside the Android APK.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">4. Local History Control</h3>
              <p className="mt-1">
                Chat and command logs live locally on-device (Room on Android / localStorage here) and can be deleted anytime.
              </p>
            </div>
          </div>
        )}

        {activeScreen === 'settings' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E1525] p-4 space-y-2.5">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Language Preference
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'bi', label: 'Bangla + English' },
                    { id: 'bn', label: 'বাংলা' },
                    { id: 'en', label: 'English' },
                  ] as Array<{ id: AssistantLanguage; label: string }>
                ).map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => onUpdateSettings({ language: lang.id })}
                    className={`px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors ${
                      settings.language === lang.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-[#151F35] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E1525] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Sun className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Appearance Theme
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Default dark navy, switchable anytime
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
                }
                className="px-3.5 py-2 min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151F35] text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
              >
                {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E1525] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Voice Output (TTS)
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.ttsEnabled}
                  aria-label="Toggle text to speech"
                  onClick={() => onUpdateSettings({ ttsEnabled: !settings.ttsEnabled })}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium ${
                    settings.ttsEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {settings.ttsEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Wake-Word Foreground Mode ("Hey Sifat")
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Requires visible persistent foreground notification
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.wakeWordEnabled}
                  aria-label="Toggle wake word mode"
                  onClick={() => onUpdateSettings({ wakeWordEnabled: !settings.wakeWordEnabled })}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium ${
                    settings.wakeWordEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {settings.wakeWordEnabled ? 'Active' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Screen Summary Consent
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Include non-password screen text only when requested
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.screenSummaryConsent}
                  aria-label="Toggle screen summary consent"
                  onClick={() =>
                    onUpdateSettings({ screenSummaryConsent: !settings.screenSummaryConsent })
                  }
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium ${
                    settings.screenSummaryConsent
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {settings.screenSummaryConsent ? 'Allowed' : 'Off'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E1525] p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  AI Provider
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Gemini (gemini-4-hydrogen) via Secure Backend Proxy
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
          </div>
        )}

        {activeScreen === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                type="search"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                placeholder="Search command history..."
                aria-label="Search command history"
                className="flex-1 min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0E1525] text-xs text-slate-900 dark:text-slate-100"
              />
              {historyItems.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="px-3 py-2 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 whitespace-nowrap shrink-0"
                >
                  Clear All
                </button>
              )}
            </div>

            {historyItems.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                No commands recorded yet. Try running a voice or text command.
              </div>
            ) : (
              <div className="space-y-2">
                {historyItems
                  .filter((item) =>
                    historyFilter.trim()
                      ? item.commandText.toLowerCase().includes(historyFilter.toLowerCase()) ||
                        item.actionSummary.toLowerCase().includes(historyFilter.toLowerCase())
                      : true
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0E1525] p-3.5 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
                          {item.commandText}
                        </div>
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                          {item.status} · {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {item.actionSummary}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteHistory(item.id)}
                        aria-label={`Delete '${item.commandText}'`}
                        className="p-2 min-h-[40px] min-w-[40px] rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Android Navigation Bar */}
      {showBottomTabs && (
        <nav
          aria-label="Android app navigation"
          className="grid grid-cols-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0E1525]"
        >
          {(
            [
              { id: 'home', label: 'Home', icon: Home },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'automation', label: 'Actions', icon: Bolt },
              { id: 'history', label: 'History', icon: History },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeScreen === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`py-2.5 min-h-[54px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
