package com.sifatagent.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sifatagent.app.domain.model.AssistantLanguage
import com.sifatagent.app.domain.model.ThemePreference
import com.sifatagent.app.ui.viewmodel.SifatViewModel

@Composable
fun SettingsScreen(
    viewModel: SifatViewModel,
    onOpenPermissions: () -> Unit,
    onOpenPrivacy: () -> Unit
) {
    val settings by viewModel.settings.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineMedium)

        SettingsSectionCard(title = "Language (বাংলা & English)") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistantLanguage.entries.forEach { lang ->
                    FilterChip(
                        selected = settings.language == lang,
                        onClick = { viewModel.setLanguage(lang) },
                        label = { Text(lang.displayName) }
                    )
                }
            }
        }

        SettingsSectionCard(title = "Appearance Theme") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ThemePreference.entries.forEach { theme ->
                    FilterChip(
                        selected = settings.themePreference == theme,
                        onClick = { viewModel.setThemePreference(theme) },
                        label = { Text(theme.name.lowercase().replaceFirstChar { it.uppercase() }) }
                    )
                }
            }
        }

        SettingsSectionCard(title = "Voice & Speech Output") {
            SettingsToggleRow(
                title = "Text-to-Speech Replies",
                subtitle = "Speak Sifat Agent responses aloud",
                checked = settings.ttsEnabled,
                onCheckedChange = { viewModel.setTtsEnabled(it) }
            )
            Text(
                text = "Speech Rate: ${"%.1f".format(settings.speechRate)}x",
                style = MaterialTheme.typography.labelMedium
            )
            Slider(
                value = settings.speechRate,
                onValueChange = { viewModel.setSpeechRate(it) },
                valueRange = 0.7f..1.5f
            )
            SettingsToggleRow(
                title = "Wake-Word Foreground Mode (\"Hey Sifat\")",
                subtitle = "Runs only with a visible persistent notification",
                checked = settings.wakeWordEnabled,
                onCheckedChange = { viewModel.setWakeWordEnabled(it) }
            )
        }

        SettingsSectionCard(title = "AI Provider & Privacy") {
            Text(
                text = "AI Provider: Gemini via Secure HTTPS Backend Proxy (no API keys stored in APK)",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            SettingsToggleRow(
                title = "Include Screen Summary When Requested",
                subtitle = "Only sends visible non-password text when you ask about your screen",
                checked = settings.screenSummaryConsentEnabled,
                onCheckedChange = { viewModel.setScreenSummaryConsent(it) }
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onOpenPermissions) {
                    Text("Permissions")
                }
                OutlinedButton(onClick = onOpenPrivacy) {
                    Text("Privacy Policy")
                }
                Button(onClick = { viewModel.clearChatHistory() }) {
                    Text("Clear Chat")
                }
            }
        }
    }
}

@Composable
private fun SettingsSectionCard(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            content()
        }
    }
}

@Composable
private fun SettingsToggleRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Medium)
            Text(
                subtitle,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
