package com.sifatagent.app.automation

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.sifatagent.app.domain.model.ScreenContextSnapshot
import com.sifatagent.app.domain.model.ScreenNodeInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.lang.ref.WeakReference

/**
 * Explicit user-enabled AccessibilityService.
 * - Never auto-enabled.
 * - Gated by a user-controlled master switch (`isMasterSwitchEnabled`).
 * - Redacts password fields (`isPassword`) and avoids storing screen text persistently.
 * - Reads or interacts with visible UI elements strictly on explicit user command.
 */
class SifatAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        instanceRef = WeakReference(this)
        _isConnected.value = true
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Intentional no-op: we do not passively log or upload background screen events.
        // Screen inspection occurs strictly on explicit user-requested commands.
    }

    override fun onInterrupt() {
        _isConnected.value = false
    }

    override fun onDestroy() {
        super.onDestroy()
        instanceRef = null
        _isConnected.value = false
    }

    fun performGoHome(): Boolean {
        if (!isAutomationAllowed()) return false
        return performGlobalAction(GLOBAL_ACTION_HOME)
    }

    fun performGoBack(): Boolean {
        if (!isAutomationAllowed()) return false
        return performGlobalAction(GLOBAL_ACTION_BACK)
    }

    fun readVisibleScreenSnapshot(): ScreenContextSnapshot? {
        if (!isAutomationAllowed()) return null
        val root = rootInActiveWindow ?: return null
        val textLines = mutableListOf<String>()
        val elements = mutableListOf<ScreenNodeInfo>()
        var redactedCount = 0

        fun traverse(node: AccessibilityNodeInfo?, depth: Int) {
            if (node == null || depth > 24 || elements.size >= 80) return

            if (node.isPassword) {
                redactedCount++
            } else {
                val text = node.text?.toString()?.trim().orEmpty()
                val desc = node.contentDescription?.toString()?.trim().orEmpty()
                if (text.isNotEmpty() && text !in textLines) {
                    textLines += text
                }
                if (text.isNotEmpty() || desc.isNotEmpty() || node.isClickable || node.isScrollable) {
                    elements += ScreenNodeInfo(
                        text = text,
                        contentDescription = desc,
                        className = node.className?.toString().orEmpty(),
                        clickable = node.isClickable,
                        scrollable = node.isScrollable,
                        editable = node.isEditable
                    )
                }
            }

            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                traverse(child, depth + 1)
            }
        }

        traverse(root, 0)
        return ScreenContextSnapshot(
            packageName = root.packageName?.toString().orEmpty(),
            capturedAtMillis = System.currentTimeMillis(),
            visibleTextLines = textLines.take(40),
            interactiveElements = elements,
            redactedSensitiveFieldsCount = redactedCount
        )
    }

    fun clickVisibleElementByLabel(targetLabel: String): Boolean {
        if (!isAutomationAllowed() || targetLabel.isBlank()) return false
        val root = rootInActiveWindow ?: return false
        val normalized = targetLabel.trim().lowercase()

        fun findAndClick(node: AccessibilityNodeInfo?): Boolean {
            if (node == null) return false
            if (!node.isPassword) {
                val text = node.text?.toString()?.trim()?.lowercase().orEmpty()
                val desc = node.contentDescription?.toString()?.trim()?.lowercase().orEmpty()
                val matches = text.contains(normalized) || desc.contains(normalized)
                if (matches) {
                    var clickableNode: AccessibilityNodeInfo? = node
                    while (clickableNode != null && !clickableNode.isClickable) {
                        clickableNode = clickableNode.parent
                    }
                    if (clickableNode != null && clickableNode.isClickable) {
                        return clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    }
                }
            }
            for (i in 0 until node.childCount) {
                if (findAndClick(node.getChild(i))) return true
            }
            return false
        }

        return findAndClick(root)
    }

    fun scrollVisibleContent(direction: String): Boolean {
        if (!isAutomationAllowed()) return false
        val root = rootInActiveWindow ?: return false
        val action = if (direction.lowercase() == "up") {
            AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        } else {
            AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
        }

        fun findScrollable(node: AccessibilityNodeInfo?): Boolean {
            if (node == null) return false
            if (node.isScrollable) {
                return node.performAction(action)
            }
            for (i in 0 until node.childCount) {
                if (findScrollable(node.getChild(i))) return true
            }
            return false
        }

        return findScrollable(root)
    }

    private fun isAutomationAllowed(): Boolean {
        return _isConnected.value && _isMasterSwitchEnabled.value
    }

    companion object {
        private var instanceRef: WeakReference<SifatAccessibilityService>? = null

        private val _isConnected = MutableStateFlow(false)
        val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

        private val _isMasterSwitchEnabled = MutableStateFlow(true)
        val isMasterSwitchEnabled: StateFlow<Boolean> = _isMasterSwitchEnabled.asStateFlow()

        fun setMasterSwitchEnabled(enabled: Boolean) {
            _isMasterSwitchEnabled.value = enabled
        }

        fun getInstance(): SifatAccessibilityService? = instanceRef?.get()
    }
}
