package com.sifatagent.app.ui.viewmodel

import android.Manifest
import android.app.Application
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.sifatagent.app.SifatApplication
import com.sifatagent.app.automation.DeviceActionExecutor
import com.sifatagent.app.automation.SifatAccessibilityService
import com.sifatagent.app.data.local.ChatMessageEntity
import com.sifatagent.app.data.local.CommandHistoryEntity
import com.sifatagent.app.data.remote.InterpretRequest
import com.sifatagent.app.domain.model.ActionPlan
import com.sifatagent.app.domain.model.ActionStep
import com.sifatagent.app.domain.model.AllowedActionType
import com.sifatagent.app.domain.model.AppSettings
import com.sifatagent.app.domain.model.AssistantLanguage
import com.sifatagent.app.domain.model.ChatMessage
import com.sifatagent.app.domain.model.CommandHistoryEntry
import com.sifatagent.app.domain.model.ExecutionResult
import com.sifatagent.app.domain.model.MessageRole
import com.sifatagent.app.domain.model.PermissionStatus
import com.sifatagent.app.domain.model.ScreenContextSnapshot
import com.sifatagent.app.domain.model.ThemePreference
import com.sifatagent.app.domain.model.VoiceStage
import com.sifatagent.app.domain.safety.ActionValidator
import com.sifatagent.app.domain.safety.CommandParser
import com.sifatagent.app.voice.SpeechInputManager
import com.sifatagent.app.voice.TextToSpeechManager
import com.sifatagent.app.voice.WakeWordForegroundService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

data class PendingConfirmation(
    val step: ActionStep,
    val remainingSteps: List<ActionStep>,
    val originalPrompt: String,
    val plan: ActionPlan
)

data class SifatUiState(
    val voiceStage: VoiceStage = VoiceStage.IDLE,
    val liveTranscript: String = "",
    val micLevel: Float = 0f,
    val statusNote: String? = null,
    val activeStepProgress: String? = null,
    val pendingConfirmation: PendingConfirmation? = null,
    val latestScreenSnapshot: ScreenContextSnapshot? = null,
    val permissionStatus: PermissionStatus = PermissionStatus(),
    val installedAppNames: List<String> = emptyList()
)

class SifatViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as SifatApplication
    private val settingsRepo = app.settingsRepository
    private val historyDao = app.database.commandHistoryDao()
    private val chatDao = app.database.chatMessageDao()
    private val apiClient = app.apiClient
    private val executor = DeviceActionExecutor(application)
    private val ttsManager = TextToSpeechManager(application)

    private val speechInputManager = SpeechInputManager(application) { finalTranscript ->
        submitCommand(finalTranscript)
    }

    val settings: StateFlow<AppSettings> = settingsRepo.settingsFlow
        .stateIn(viewModelScope, SharingStarted.Eagerly, AppSettings())

    val chatMessages: StateFlow<List<ChatMessage>> = chatDao.observeAll()
        .map { entities ->
            entities.map {
                ChatMessage(
                    id = it.id,
                    role = runCatching { MessageRole.valueOf(it.role) }.getOrDefault(MessageRole.ASSISTANT),
                    text = it.text,
                    language = it.language,
                    timestampMillis = it.timestampMillis
                )
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val commandHistory: StateFlow<List<CommandHistoryEntry>> = historyDao.observeAll()
        .map { entities ->
            entities.map {
                CommandHistoryEntry(
                    id = it.id,
                    commandText = it.commandText,
                    intentType = it.intentType,
                    actionSummary = it.actionSummary,
                    status = it.status,
                    timestampMillis = it.timestampMillis
                )
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _uiState = MutableStateFlow(SifatUiState())
    val uiState: StateFlow<SifatUiState> = _uiState.asStateFlow()

    init {
        refreshPermissions()
        loadInstalledAppLabels()

        viewModelScope.launch {
            settingsRepo.settingsFlow.collectLatest { current ->
                SifatAccessibilityService.setMasterSwitchEnabled(current.automationMasterSwitch)
            }
        }

        viewModelScope.launch {
            speechInputManager.state.collectLatest { speechState ->
                val stage = when {
                    speechState.isListening -> VoiceStage.LISTENING
                    speechState.errorMessage != null -> VoiceStage.ERROR
                    ttsManager.isSpeaking.value -> VoiceStage.SPEAKING
                    else -> if (_uiState.value.voiceStage == VoiceStage.PROCESSING) {
                        VoiceStage.PROCESSING
                    } else {
                        VoiceStage.IDLE
                    }
                }
                _uiState.value = _uiState.value.copy(
                    voiceStage = stage,
                    liveTranscript = speechState.partialTranscript,
                    micLevel = speechState.rmsDb,
                    statusNote = speechState.errorMessage ?: _uiState.value.statusNote
                )
            }
        }

        viewModelScope.launch {
            ttsManager.isSpeaking.collectLatest { speaking ->
                if (speaking) {
                    _uiState.value = _uiState.value.copy(voiceStage = VoiceStage.SPEAKING)
                } else if (_uiState.value.voiceStage == VoiceStage.SPEAKING) {
                    _uiState.value = _uiState.value.copy(voiceStage = VoiceStage.IDLE)
                }
            }
        }
    }

    fun refreshPermissions() {
        val ctx = getApplication<Application>()
        val micGranted = ContextCompat.checkSelfPermission(
            ctx, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        val notifGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                ctx, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        _uiState.value = _uiState.value.copy(
            permissionStatus = PermissionStatus(
                recordAudioGranted = micGranted,
                notificationsGranted = notifGranted,
                accessibilityServiceEnabled = SifatAccessibilityService.isConnected.value,
                writeSettingsGranted = Settings.System.canWrite(ctx),
                speechRecognitionAvailable = SpeechRecognizer.isRecognitionAvailable(ctx)
            )
        )
    }

    private fun loadInstalledAppLabels() {
        viewModelScope.launch(Dispatchers.IO) {
            val pm = getApplication<Application>().packageManager
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val labels = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
                .mapNotNull { it.loadLabel(pm)?.toString() }
                .distinct()
                .sorted()
                .take(45)
            _uiState.value = _uiState.value.copy(installedAppNames = labels)
        }
    }

    fun startVoiceListening() {
        refreshPermissions()
        if (!_uiState.value.permissionStatus.recordAudioGranted) {
            _uiState.value = _uiState.value.copy(
                voiceStage = VoiceStage.ERROR,
                statusNote = "Microphone permission is required before starting voice recognition."
            )
            return
        }
        ttsManager.stop()
        speechInputManager.clearError()
        speechInputManager.startListening(settings.value.language.localeTag)
    }

    fun stopVoiceListening() {
        speechInputManager.stopListening()
        _uiState.value = _uiState.value.copy(voiceStage = VoiceStage.IDLE, micLevel = 0f)
    }

    fun stopSpeaking() {
        ttsManager.stop()
        _uiState.value = _uiState.value.copy(voiceStage = VoiceStage.IDLE)
    }

    fun submitCommand(rawInput: String) {
        val prompt = rawInput.trim()
        if (prompt.isEmpty()) return

        viewModelScope.launch {
            appendChatMessage(MessageRole.USER, prompt, settings.value.language.code)
            _uiState.value = _uiState.value.copy(
                voiceStage = VoiceStage.PROCESSING,
                statusNote = null,
                activeStepProgress = "Analyzing request..."
            )

            // 1. Check local deterministic fast-path & security blocklist first
            val localPlan = CommandParser.tryLocalDeterministicParse(prompt)
            val planResult = if (localPlan != null) {
                Result.success(localPlan)
            } else {
                val screenTextSummary = if (settings.value.screenSummaryConsentEnabled) {
                    _uiState.value.latestScreenSnapshot?.visibleTextLines?.joinToString("\n")
                } else {
                    null
                }
                withContext(Dispatchers.IO) {
                    apiClient.interpret(
                        InterpretRequest(
                            prompt = prompt,
                            preferredLanguage = settings.value.language.code,
                            screenSummary = screenTextSummary,
                            installedAppNames = _uiState.value.installedAppNames
                        )
                    ).map { it.plan }
                }
            }

            planResult.onSuccess { rawPlan ->
                val validation = ActionValidator.validatePlan(rawPlan, prompt)
                val validatedPlan = validation.validatedPlan
                if (validatedPlan.replyText.isNotBlank()) {
                    appendChatMessage(
                        MessageRole.ASSISTANT,
                        validatedPlan.replyText,
                        validatedPlan.replyLanguage
                    )
                    if (settings.value.ttsEnabled) {
                        ttsManager.speak(
                            validatedPlan.replyText,
                            validatedPlan.replyLanguage,
                            settings.value.speechRate
                        )
                    }
                }

                if (validatedPlan.steps.isEmpty()) {
                    recordHistory(
                        prompt,
                        validatedPlan.intentType,
                        validatedPlan.replyText.take(100),
                        if (validation.isValid) "Completed" else "Blocked"
                    )
                    _uiState.value = _uiState.value.copy(
                        voiceStage = if (ttsManager.isSpeaking.value) VoiceStage.SPEAKING else VoiceStage.IDLE,
                        activeStepProgress = null
                    )
                } else {
                    executeStepQueue(validatedPlan.steps, prompt, validatedPlan)
                }
            }.onFailure { err ->
                val msg = "Unable to reach Sifat Agent backend: ${err.localizedMessage ?: "Network error"}"
                appendChatMessage(MessageRole.SYSTEM, msg, "en")
                recordHistory(prompt, "error", msg, "Failed")
                _uiState.value = _uiState.value.copy(
                    voiceStage = VoiceStage.ERROR,
                    statusNote = msg,
                    activeStepProgress = null
                )
            }
        }
    }

    private suspend fun executeStepQueue(
        steps: List<ActionStep>,
        originalPrompt: String,
        plan: ActionPlan
    ) {
        if (steps.isEmpty()) {
            _uiState.value = _uiState.value.copy(
                voiceStage = if (ttsManager.isSpeaking.value) VoiceStage.SPEAKING else VoiceStage.IDLE,
                activeStepProgress = null
            )
            return
        }

        val current = steps.first()
        val remaining = steps.drop(1)

        if (current.requiresConfirmation) {
            _uiState.value = _uiState.value.copy(
                activeStepProgress = "Awaiting user confirmation for ${current.action.name}",
                pendingConfirmation = PendingConfirmation(
                    step = current,
                    remainingSteps = remaining,
                    originalPrompt = originalPrompt,
                    plan = plan
                )
            )
            return
        }

        _uiState.value = _uiState.value.copy(
            activeStepProgress = "Running: ${current.description.ifBlank { current.action.name }}"
        )

        val result = executor.executeStep(
            step = current,
            automationMasterSwitch = settings.value.automationMasterSwitch,
            onScreenSnapshotCaptured = { snapshot ->
                _uiState.value = _uiState.value.copy(latestScreenSnapshot = snapshot)
            }
        )

        appendChatMessage(
            MessageRole.SYSTEM,
            result.message,
            plan.replyLanguage
        )
        recordHistory(
            originalPrompt,
            plan.intentType,
            "${current.action.name}: ${result.message}",
            if (result.success) "Executed" else "Denied/Failed"
        )

        if (result.success && remaining.isNotEmpty()) {
            executeStepQueue(remaining, originalPrompt, plan)
        } else {
            _uiState.value = _uiState.value.copy(
                voiceStage = if (ttsManager.isSpeaking.value) VoiceStage.SPEAKING else VoiceStage.IDLE,
                activeStepProgress = null
            )
        }
    }

    fun confirmPendingAction() {
        val pending = _uiState.value.pendingConfirmation ?: return
        _uiState.value = _uiState.value.copy(pendingConfirmation = null)
        viewModelScope.launch {
            val result = executor.executeStep(
                step = pending.step,
                automationMasterSwitch = settings.value.automationMasterSwitch
            )
            appendChatMessage(MessageRole.SYSTEM, result.message, pending.plan.replyLanguage)
            recordHistory(
                pending.originalPrompt,
                pending.plan.intentType,
                "${pending.step.action.name}: ${result.message}",
                if (result.success) "Confirmed & Executed" else "Failed"
            )
            executeStepQueue(pending.remainingSteps, pending.originalPrompt, pending.plan)
        }
    }

    fun cancelPendingAction() {
        val pending = _uiState.value.pendingConfirmation ?: return
        _uiState.value = _uiState.value.copy(
            pendingConfirmation = null,
            activeStepProgress = null,
            voiceStage = VoiceStage.IDLE
        )
        viewModelScope.launch {
            appendChatMessage(MessageRole.SYSTEM, "Action cancelled by user.", "en")
            recordHistory(
                pending.originalPrompt,
                pending.plan.intentType,
                "${pending.step.action.name} cancelled",
                "Cancelled"
            )
        }
    }

    fun readScreenNow() {
        submitCommand("read screen")
    }

    fun setLanguage(lang: AssistantLanguage) {
        viewModelScope.launch { settingsRepo.setLanguage(lang) }
    }

    fun setThemePreference(theme: ThemePreference) {
        viewModelScope.launch { settingsRepo.setThemePreference(theme) }
    }

    fun setTtsEnabled(enabled: Boolean) {
        viewModelScope.launch { settingsRepo.setTtsEnabled(enabled) }
    }

    fun setSpeechRate(rate: Float) {
        viewModelScope.launch { settingsRepo.setSpeechRate(rate) }
    }

    fun setWakeWordEnabled(enabled: Boolean) {
        viewModelScope.launch {
            settingsRepo.setWakeWordEnabled(enabled)
            val ctx = getApplication<Application>()
            if (enabled) {
                WakeWordForegroundService.start(ctx)
            } else {
                WakeWordForegroundService.stop(ctx)
            }
        }
    }

    fun setAutomationMasterSwitch(enabled: Boolean) {
        viewModelScope.launch {
            settingsRepo.setAutomationMasterSwitch(enabled)
            SifatAccessibilityService.setMasterSwitchEnabled(enabled)
        }
    }

    fun setScreenSummaryConsent(enabled: Boolean) {
        viewModelScope.launch { settingsRepo.setScreenSummaryConsent(enabled) }
    }

    fun deleteHistoryItem(id: String) {
        viewModelScope.launch(Dispatchers.IO) { historyDao.deleteById(id) }
    }

    fun clearHistory() {
        viewModelScope.launch(Dispatchers.IO) { historyDao.clearAll() }
    }

    fun clearChatHistory() {
        viewModelScope.launch(Dispatchers.IO) { chatDao.clearAll() }
    }

    private suspend fun appendChatMessage(role: MessageRole, text: String, language: String) {
        withContext(Dispatchers.IO) {
            chatDao.insert(
                ChatMessageEntity(
                    id = UUID.randomUUID().toString(),
                    role = role.name,
                    text = text,
                    language = language,
                    timestampMillis = System.currentTimeMillis()
                )
            )
        }
    }

    private suspend fun recordHistory(
        command: String,
        intentType: String,
        summary: String,
        status: String
    ) {
        withContext(Dispatchers.IO) {
            historyDao.insert(
                CommandHistoryEntity(
                    id = UUID.randomUUID().toString(),
                    commandText = command,
                    intentType = intentType,
                    actionSummary = summary,
                    status = status,
                    timestampMillis = System.currentTimeMillis()
                )
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        speechInputManager.destroy()
        ttsManager.shutdown()
    }
}
