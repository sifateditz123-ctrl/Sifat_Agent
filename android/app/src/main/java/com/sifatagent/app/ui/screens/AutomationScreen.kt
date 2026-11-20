package com.sifatagent.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sifatagent.app.domain.safety.ActionValidator
import com.sifatagent.app.ui.viewmodel.SifatViewModel

@Composable
fun AutomationScreen(
    viewModel: SifatViewModel,
    onOpenPermissions: () -> Unit
) {
    val settings by viewModel.settings.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    val specs = ActionValidator.registry.values.toList()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = "Allow-Listed Automation",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Only verified, permission-scoped Android operations are permitted.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Automation Master Switch", fontWeight = FontWeight.SemiBold)
                        Text(
                            text = if (uiState.permissionStatus.accessibilityServiceEnabled) {
                                "Accessibility Service connected"
                            } else {
                                "Accessibility Service not enabled"
                            },
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = settings.automationMasterSwitch,
                        onCheckedChange = { viewModel.setAutomationMasterSwitch(it) }
                    )
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = { viewModel.readScreenNow() }) {
                    Text("Read Active Screen")
                }
                OutlinedButton(onClick = onOpenPermissions) {
                    Text("Setup Permissions")
                }
            }
        }

        uiState.latestScreenSnapshot?.let { snap ->
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "Latest Screen Snapshot (${snap.packageName})",
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Redacted password fields: ${snap.redactedSensitiveFieldsCount}",
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = snap.visibleTextLines.take(8).joinToString(" • "),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }

        items(specs) { spec ->
            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = spec.action.name.replace('_', ' '),
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Risk: ${spec.riskLevel.name} • Permission: ${spec.permissionRequirement} • Confirm: ${if (spec.confirmationRequired) "Required" else "Auto"}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
