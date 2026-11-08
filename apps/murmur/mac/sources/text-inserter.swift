import AppKit
import ApplicationServices

/// Puts text into whatever field has focus, in any app.
///
/// Uses the clipboard + a synthetic Cmd+V because it works almost everywhere
/// (browsers, Electron apps, terminals). The user's clipboard is restored afterwards.
enum TextInserter {
    private static let kVK_ANSI_V: CGKeyCode = 9
    private static let kVK_ANSI_C: CGKeyCode = 8

    static func paste(_ text: String) {
        guard !text.isEmpty else { return }
        let pb = NSPasteboard.general
        let saved = snapshot(pb)

        pb.clearContents()
        pb.setString(text, forType: .string)
        // Ask clipboard managers not to record this transient write.
        pb.setString("", forType: NSPasteboard.PasteboardType("org.nspasteboard.TransientType"))
        let ourChange = pb.changeCount

        sendCommand(key: kVK_ANSI_V)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            // If the user copied something in the meantime, leave it alone.
            guard pb.changeCount == ourChange else { return }
            pb.clearContents()
            if !saved.isEmpty { pb.writeObjects(saved) }
        }
    }

    /// The focused app's selected text. Tries Accessibility first (instant, no
    /// clipboard churn), then falls back to Cmd+C.
    static func selectedText() -> String? {
        if let text = selectedTextViaAccessibility(), !text.isEmpty { return text }

        let pb = NSPasteboard.general
        let saved = snapshot(pb)
        let before = pb.changeCount
        sendCommand(key: kVK_ANSI_C)

        // Wait briefly for the copy to land.
        let deadline = Date().addingTimeInterval(0.25)
        while pb.changeCount == before && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.01))
        }
        guard pb.changeCount != before else { return nil }
        let text = pb.string(forType: .string)
        pb.clearContents()
        if !saved.isEmpty { pb.writeObjects(saved) }
        return text
    }

    private static func selectedTextViaAccessibility() -> String? {
        let system = AXUIElementCreateSystemWide()
        var focused: CFTypeRef?
        guard AXUIElementCopyAttributeValue(system, kAXFocusedUIElementAttribute as CFString, &focused) == .success,
              let element = focused else { return nil }
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element as! AXUIElement, kAXSelectedTextAttribute as CFString, &value) == .success
        else { return nil }
        return value as? String
    }

    private static func sendCommand(key: CGKeyCode) {
        let src = CGEventSource(stateID: .combinedSessionState)
        let down = CGEvent(keyboardEventSource: src, virtualKey: key, keyDown: true)
        let up = CGEvent(keyboardEventSource: src, virtualKey: key, keyDown: false)
        down?.flags = .maskCommand
        up?.flags = .maskCommand
        down?.post(tap: .cghidEventTap)
        up?.post(tap: .cghidEventTap)
    }

    private static func snapshot(_ pb: NSPasteboard) -> [NSPasteboardItem] {
        (pb.pasteboardItems ?? []).map { item in
            let copy = NSPasteboardItem()
            for type in item.types {
                if let data = item.data(forType: type) { copy.setData(data, forType: type) }
            }
            return copy
        }
    }
}
