package com.sifatagent.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sifatagent.app.domain.model.RiskLevel
import com.sifatagent.app.ui.theme.SemanticDanger
import com.sifatagent.app.ui.theme.SemanticWarning
import com.sifatagent.app.ui.viewmodel.PendingConfirmation

@Composable
fun ActionConfirmationDialog(
    pending: PendingConfirmation,
    onConfirm: () -> Unit,
    onCancel: () -> Unit
) {
    val step = pending.step
    val riskColor = when (step.riskLevel) {
        RiskLevel.HIGH, RiskLevel.BLOCKED -> SemanticDanger
        RiskLevel.MEDIUM -> SemanticWarning
        RiskLevel.LOW -> MaterialTheme.colorScheme.primary
    }

    AlertDialog(
        onDismissRequest = onCancel,
        title = {
            Text(
                text = "Confirm Sensitive Action",
                style = MaterialTheme.typography.titleLarge
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Review the details below before Sifat Agent opens the system action.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "Action: ${step.action.name.replace('_', ' ')}",
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Risk Level: ${step.riskLevel.name} • Permission: ${step.permissionRequirement}",
                            style = MaterialTheme.typography.labelMedium,
                            color = riskColor
                        )
                        if (step.description.isNotBlank()) {
                            Text(
                                text = step.description,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        step.parameters.forEach { (k, v) ->
                            Text(
                                text = "$k: $v",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Approve & Preview")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onCancel) {
                Text("Cancel")
            }
        }
    )
}
