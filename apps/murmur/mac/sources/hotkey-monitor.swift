import AppKit
import CoreGraphics

/// Global keyboard monitor built on a CGEventTap.
///
/// A tap (rather than NSEvent monitors or Carbon hotkeys) is what lets us use a
/// bare modifier like Right Option as push-to-talk, and swallow Escape while recording.
/// Requires the Accessibility permission.
final class HotkeyMonitor {
    /// Right Option. Change to 54 for Right Command, 63 for Fn/Globe.
    static let triggerKeyCode: Int64 = 61
    /// Device-specific flag bit for Right Option (NX_DEVICERALTKEYMASK).
    static let triggerFlagMask: UInt64 = 0x40
    static let escapeKeyCode: Int64 = 53

    var onPress: ((_ shiftHeld: Bool) -> Void)?
    var onRelease: (() -> Void)?
    /// Return true to swallow the Escape key (only while recording).
    var onEscape: (() -> Bool)?

    private var tap: CFMachPort?
    private var isDown = false

    /// Returns false if the tap couldn't be created (permission not granted yet).
    @discardableResult
    func start() -> Bool {
        guard tap == nil else { return true }
        let mask = (1 << CGEventType.flagsChanged.rawValue) | (1 << CGEventType.keyDown.rawValue)
        let callback: CGEventTapCallBack = { _, type, event, refcon in
            guard let refcon else { return Unmanaged.passUnretained(event) }
            let monitor = Unmanaged<HotkeyMonitor>.fromOpaque(refcon).takeUnretainedValue()
            return monitor.handle(type: type, event: event)
        }
        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: CGEventMask(mask),
            callback: callback,
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        ) else { return false }

        self.tap = tap
        let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
        return true
    }

    private func handle(type: CGEventType, event: CGEvent) -> Unmanaged<CGEvent>? {
        switch type {
        case .tapDisabledByTimeout, .tapDisabledByUserInput:
            // macOS disables slow taps; turn it straight back on.
            if let tap { CGEvent.tapEnable(tap: tap, enable: true) }

        case .flagsChanged:
            let code = event.getIntegerValueField(.keyboardEventKeycode)
            guard code == Self.triggerKeyCode else { break }
            let down = event.flags.rawValue & Self.triggerFlagMask != 0
            // Handle outside the tap callback: macOS disables taps that block, and
            // grabbing the selection may post synthetic key events of its own.
            if down && !isDown {
                isDown = true
                let shift = event.flags.contains(.maskShift)
                DispatchQueue.main.async { self.onPress?(shift) }
            } else if !down && isDown {
                isDown = false
                DispatchQueue.main.async { self.onRelease?() }
            }

        case .keyDown:
            if event.getIntegerValueField(.keyboardEventKeycode) == Self.escapeKeyCode,
               onEscape?() == true {
                return nil // swallow
            }

        default:
            break
        }
        return Unmanaged.passUnretained(event)
    }
}
