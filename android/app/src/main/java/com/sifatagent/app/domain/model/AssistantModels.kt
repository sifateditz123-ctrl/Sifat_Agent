package com.sifatagent.app.domain.model

import kotlinx.serialization.Serializable

enum class AssistantLanguage(val code: String, val displayName: String, val localeTag: String) {
    ENGLISH("en", "English", "en-US"),
    BANGLA("bn", "বাংলা", "bn-BD"),
    BILINGUAL("bi", "Bangla + English", "bn-BD")
}

enum class ThemePreference {
    DARK,
    LIGHT,
    SYSTEM
}

enum class VoiceStage {
    IDLE,
    LISTENING,
    PROCESSING,
    SPEAKING,
    ERROR
}

@Serializable
enum class RiskLevel {
    LOW,
    MEDIUM,
    HIGH,
    BLOCKED
}

@Serializable
enum class AllowedActionType {
    CONVERSATION,
    CLARIFY,
    LAUNCH_APP,
    OPEN_SETTINGS,
    GO_HOME,
    GO_BACK,
    READ_SCREEN,
    CLICK_ELEMENT,
    SCROLL_SCREEN,
    OPEN_URL,
    SET_BRIGHTNESS,
    DIAL_NUMBER,
    COMPOSE_SMS,
    SHARE_CONTENT,
    UNSUPPORTED_OR_BLOCKED
}

@Serializable
data class ActionStep(
    val stepId: String,
    val action: AllowedActionType,
    val parameters: Map<String, String> = emptyMap(),
    val description: String = "",
    val permissionRequirement: String = "NONE",
    val riskLevel: RiskLevel = RiskLevel.LOW,
    val requiresConfirmation: Boolean = false
)

@Serializable
data class ActionPlan(
    val intentType: String = "conversation", // "conversation" | "phone_control" | "clarification" | "blocked"
    val replyText: String = "",
    val replyLanguage: String = "en",
    val clarifyingQuestion: String? = null,
    val steps: List<ActionStep> = emptyList(),
    val suggestedNextAction: String? = null
)

data class ExecutionResult(
    val stepId: String,
    val action: AllowedActionType,
    val success: Boolean,
    val message: String,
    val timestampMillis: Long = System.currentTimeMillis()
)

data class ChatMessage(
    val id: String,
    val role: MessageRole,
    val text: String,
    val language: String = "en",
    val timestampMillis: Long = System.currentTimeMillis(),
    val plan: ActionPlan? = null,
    val executionResults: List<ExecutionResult> = emptyList()
)

enum class MessageRole {
    USER,
    ASSISTANT,
    SYSTEM
}

data class CommandHistoryEntry(
    val id: String,
    val commandText: String,
    val intentType: String,
    val actionSummary: String,
    val status: String,
    val timestampMillis: Long = System.currentTimeMillis()
)

data class ScreenNodeInfo(
    val text: String,
    val contentDescription: String,
    val className: String,
    val clickable: Boolean,
    val scrollable: Boolean,
    val editable: Boolean
)

data class ScreenContextSnapshot(
    val packageName: String,
    val capturedAtMillis: Long,
    val visibleTextLines: List<String>,
    val interactiveElements: List<ScreenNodeInfo>,
    val redactedSensitiveFieldsCount: Int
)

data class AppSettings(
    val language: AssistantLanguage = AssistantLanguage.BILINGUAL,
    val themePreference: ThemePreference = ThemePreference.DARK,
    val ttsEnabled: Boolean = true,
    val speechRate: Float = 1.0f,
    val wakeWordEnabled: Boolean = false,
    val automationMasterSwitch: Boolean = true,
    val screenSummaryConsentEnabled: Boolean = false
)

data class PermissionStatus(
    val recordAudioGranted: Boolean = false,
    val notificationsGranted: Boolean = false,
    val accessibilityServiceEnabled: Boolean = false,
    val writeSettingsGranted: Boolean = false,
    val speechRecognitionAvailable: Boolean = true
)
