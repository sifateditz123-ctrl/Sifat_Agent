package com.sifatagent.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.sifatagent.app.ui.components.ActionConfirmationDialog
import com.sifatagent.app.ui.screens.AutomationScreen
import com.sifatagent.app.ui.screens.ChatScreen
import com.sifatagent.app.ui.screens.HistoryScreen
import com.sifatagent.app.ui.screens.HomeScreen
import com.sifatagent.app.ui.screens.PermissionSetupScreen
import com.sifatagent.app.ui.screens.PrivacyPolicyScreen
import com.sifatagent.app.ui.screens.SettingsScreen
import com.sifatagent.app.ui.screens.SplashScreen
import com.sifatagent.app.ui.screens.VoiceAssistantScreen
import com.sifatagent.app.ui.viewmodel.SifatViewModel

object Routes {
    const val SPLASH = "splash"
    const val HOME = "home"
    const val CHAT = "chat"
    const val VOICE = "voice"
    const val AUTOMATION = "automation"
    const val PERMISSIONS = "permissions"
    const val SETTINGS = "settings"
    const val HISTORY = "history"
    const val PRIVACY = "privacy"
}

@Composable
fun SifatNavGraph(viewModel: SifatViewModel) {
    val navController = rememberNavController()
    val uiState by viewModel.uiState.collectAsState()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val showBottomBar = currentRoute in setOf(
        Routes.HOME,
        Routes.CHAT,
        Routes.AUTOMATION,
        Routes.HISTORY,
        Routes.SETTINGS
    )

    uiState.pendingConfirmation?.let { pending ->
        ActionConfirmationDialog(
            pending = pending,
            onConfirm = { viewModel.confirmPendingAction() },
            onCancel = { viewModel.cancelPendingAction() }
        )
    }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    NavigationBarItem(
                        selected = currentRoute == Routes.HOME,
                        onClick = { navController.navigate(Routes.HOME) { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                        label = { Text("Home") }
                    )
                    NavigationBarItem(
                        selected = currentRoute == Routes.CHAT,
                        onClick = { navController.navigate(Routes.CHAT) { launchSingleTop = true } },
                        icon = { Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = "Chat") },
                        label = { Text("Chat") }
                    )
                    NavigationBarItem(
                        selected = currentRoute == Routes.AUTOMATION,
                        onClick = { navController.navigate(Routes.AUTOMATION) { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.Bolt, contentDescription = "Actions") },
                        label = { Text("Actions") }
                    )
                    NavigationBarItem(
                        selected = currentRoute == Routes.HISTORY,
                        onClick = { navController.navigate(Routes.HISTORY) { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.History, contentDescription = "History") },
                        label = { Text("History") }
                    )
                    NavigationBarItem(
                        selected = currentRoute == Routes.SETTINGS,
                        onClick = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } },
                        icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                        label = { Text("Settings") }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.SPLASH,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Routes.SPLASH) {
                SplashScreen(
                    onFinished = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    }
                )
            }
            composable(Routes.HOME) {
                HomeScreen(
                    viewModel = viewModel,
                    onOpenVoice = { navController.navigate(Routes.VOICE) },
                    onOpenPermissions = { navController.navigate(Routes.PERMISSIONS) },
                    onOpenChat = { navController.navigate(Routes.CHAT) }
                )
            }
            composable(Routes.CHAT) {
                ChatScreen(viewModel = viewModel)
            }
            composable(Routes.VOICE) {
                VoiceAssistantScreen(
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Routes.AUTOMATION) {
                AutomationScreen(
                    viewModel = viewModel,
                    onOpenPermissions = { navController.navigate(Routes.PERMISSIONS) }
                )
            }
            composable(Routes.PERMISSIONS) {
                PermissionSetupScreen(
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() },
                    onOpenPrivacy = { navController.navigate(Routes.PRIVACY) }
                )
            }
            composable(Routes.SETTINGS) {
                SettingsScreen(
                    viewModel = viewModel,
                    onOpenPermissions = { navController.navigate(Routes.PERMISSIONS) },
                    onOpenPrivacy = { navController.navigate(Routes.PRIVACY) }
                )
            }
            composable(Routes.HISTORY) {
                HistoryScreen(viewModel = viewModel)
            }
            composable(Routes.PRIVACY) {
                PrivacyPolicyScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
