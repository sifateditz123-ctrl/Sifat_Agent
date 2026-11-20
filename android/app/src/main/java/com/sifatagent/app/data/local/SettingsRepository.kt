package com.sifatagent.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.sifatagent.app.domain.model.AppSettings
import com.sifatagent.app.domain.model.AssistantLanguage
import com.sifatagent.app.domain.model.ThemePreference
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "sifat_settings")

class SettingsRepository(private val context: Context) {

    private object Keys {
        val LANGUAGE = stringPreferencesKey("language")
        val THEME = stringPreferencesKey("theme")
        val TTS_ENABLED = booleanPreferencesKey("tts_enabled")
        val SPEECH_RATE = floatPreferencesKey("speech_rate")
        val WAKE_WORD_ENABLED = booleanPreferencesKey("wake_word_enabled")
        val AUTOMATION_MASTER_SWITCH = booleanPreferencesKey("automation_master_switch")
        val SCREEN_SUMMARY_CONSENT = booleanPreferencesKey("screen_summary_consent")
    }

    val settingsFlow: Flow<AppSettings> = context.settingsDataStore.data.map { prefs ->
        AppSettings(
            language = prefs[Keys.LANGUAGE]?.let { code ->
                AssistantLanguage.entries.firstOrNull { it.code == code }
            } ?: AssistantLanguage.BILINGUAL,
            themePreference = prefs[Keys.THEME]?.let { name ->
                ThemePreference.entries.firstOrNull { it.name == name }
            } ?: ThemePreference.DARK,
            ttsEnabled = prefs[Keys.TTS_ENABLED] ?: true,
            speechRate = prefs[Keys.SPEECH_RATE] ?: 1.0f,
            wakeWordEnabled = prefs[Keys.WAKE_WORD_ENABLED] ?: false,
            automationMasterSwitch = prefs[Keys.AUTOMATION_MASTER_SWITCH] ?: true,
            screenSummaryConsentEnabled = prefs[Keys.SCREEN_SUMMARY_CONSENT] ?: false
        )
    }

    suspend fun setLanguage(language: AssistantLanguage) {
        context.settingsDataStore.edit { it[Keys.LANGUAGE] = language.code }
    }

    suspend fun setThemePreference(theme: ThemePreference) {
        context.settingsDataStore.edit { it[Keys.THEME] = theme.name }
    }

    suspend fun setTtsEnabled(enabled: Boolean) {
        context.settingsDataStore.edit { it[Keys.TTS_ENABLED] = enabled }
    }

    suspend fun setSpeechRate(rate: Float) {
        context.settingsDataStore.edit { it[Keys.SPEECH_RATE] = rate.coerceIn(0.6f, 1.8f) }
    }

    suspend fun setWakeWordEnabled(enabled: Boolean) {
        context.settingsDataStore.edit { it[Keys.WAKE_WORD_ENABLED] = enabled }
    }

    suspend fun setAutomationMasterSwitch(enabled: Boolean) {
        context.settingsDataStore.edit { it[Keys.AUTOMATION_MASTER_SWITCH] = enabled }
    }

    suspend fun setScreenSummaryConsent(enabled: Boolean) {
        context.settingsDataStore.edit { it[Keys.SCREEN_SUMMARY_CONSENT] = enabled }
    }
}
