package com.sifatagent.app.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.sifatagent.app.ui.theme.SemanticSuccess
import com.sifatagent.app.ui.theme.SemanticWarning
import com.sifatagent.app.ui.viewmodel.SifatViewModel

@Composable
fun PermissionSetupScreen(
    viewModel: SifatViewModel,
    onBack: () -> Unit,
    onOpenPrivacy: () -> Unit
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val status = uiState.permissionStatus
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.refreshPermissions()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val micLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { viewModel.refreshPermissions() }

    val notifLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { viewModel.refreshPermissions() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Permission Setup", style = MaterialTheme.typography.headlineMedium)
        }

        PermissionCard(
            title = "Microphone (Speech Input)",
            explanation = "Used strictly when you tap the microphone button—or when you explicitly turn on the Wake-Word Foreground Service with a visible notification.",
            granted = status.recordAudioGranted,
            actionLabel = "Grant Microphone",
            onAction = { micLauncher.launch(Manifest.permission.RECORD_AUDIO) }
        )

        PermissionCard(
            title = "Accessibility Service (Manual Enable)",
            explanation = "Allows Sifat Agent to read visible screen text, tap accessible labels, scroll, and press Back/Home only when you command it. You must enable this manually in Android Settings.",
            granted = status.accessibilityServiceEnabled,
            actionLabel = "Open Accessibility Settings",
            onAction = {
                context.startActivity(
                    Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        )

        PermissionCard(
            title = "Modify System Settings (Brightness)",
            explanation = "Optional permission required by Android only if you ask Sifat Agent to adjust screen brightness.",
            granted = status.writeSettingsGranted,
            actionLabel = "Open Write Settings",
            onAction = {
                val intent = Intent(
                    Settings.ACTION_MANAGE_WRITE_SETTINGS,
                    Uri.parse("package:${context.packageName}")
                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            }
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            PermissionCard(
                title = "Notifications (Foreground Mic Notice)",
                explanation = "Required on Android 13+ so the Wake-Word service can show a persistent visible microphone indicator.",
                granted = status.notificationsGranted,
                actionLabel = "Allow Notifications",
                onAction = { notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS) }
            )
        }

        OutlinedButton(
            onClick = onOpenPrivacy,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Read Privacy & Data Policy")
        }
    }
}

@Composable
private fun PermissionCard(
    title: String,
    explanation: String,
    granted: Boolean,
    actionLabel: String,
    onAction: () -> Unit
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
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                Text(
                    text = if (granted) "Granted" else "Not Enabled",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (granted) SemanticSuccess else SemanticWarning
                )
            }
            Text(
                text = explanation,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (!granted) {
                Button(onClick = onAction) {
                    Text(actionLabel)
                }
            }
        }
    }
}
