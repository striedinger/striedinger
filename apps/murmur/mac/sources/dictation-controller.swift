import AppKit

/// Turns hotkey presses into dictation sessions.
///
///   Hold Right ⌥              push-to-talk in the current mode; release to paste
///   Double-tap Right ⌥        hands-free; tap once more to finish
///   Hold Right ⌥ + Shift      command mode: speak an edit for the selected text
///   Esc while recording       cancel
final class DictationController {
    private enum Phase {
        case idle
        case holding(since: Date, app: String?)
        case tapPending(app: String?)        // short tap; waiting to see if a second tap follows
        case handsFree(app: String?)
        case command(selection: String, app: String?)
        case processing
    }

    var currentMode: String
    var modeName: () -> String = { "" }

    private let engine: Engine
    private let overlay: OverlayController
    private let queue = DispatchQueue(label: "murmur.engine", qos: .userInitiated)
    private var phase: Phase = .idle
    private var levelTimer: Timer?
    private var tapTimeout: DispatchWorkItem?

    private let tapThreshold: TimeInterval = 0.25
    private let doubleTapWindow: TimeInterval = 0.35

    init(engine: Engine, overlay: OverlayController, mode: String) {
        self.engine = engine
        self.overlay = overlay
        self.currentMode = mode
    }

    var isRecording: Bool {
        switch phase {
        case .holding, .tapPending, .handsFree, .command: return true
        default: return false
        }
    }

    // MARK: Hotkey events (main thread)

    func keyPressed(shiftHeld: Bool) {
        switch phase {
        case .idle:
            let app = NSWorkspace.shared.frontmostApplication?.bundleIdentifier
            if shiftHeld, engine.llmAvailable(), let selection = TextInserter.selectedText(), !selection.isEmpty {
                phase = .command(selection: selection, app: app)
                beginRecording(.command)
            } else {
                phase = .holding(since: Date(), app: app)
                beginRecording(.listening(handsFree: false))
            }

        case .tapPending(let app):
            // Second tap: switch to hands-free. Recording has been running since the first tap.
            tapTimeout?.cancel()
            phase = .handsFree(app: app)
            overlay.show(.listening(handsFree: true))

        case .handsFree(let app):
            finish(app: app)

        default:
            break
        }
    }

    func keyReleased() {
        switch phase {
        case .holding(let since, let app):
            if Date().timeIntervalSince(since) < tapThreshold {
                // Too short to be speech: maybe the first half of a double-tap.
                phase = .tapPending(app: app)
                let work = DispatchWorkItem { [weak self] in
                    guard let self, case .tapPending = self.phase else { return }
                    self.cancel()
                }
                tapTimeout = work
                DispatchQueue.main.asyncAfter(deadline: .now() + doubleTapWindow, execute: work)
            } else {
                finish(app: app)
            }

        case .command(let selection, let app):
            finishCommand(selection: selection, app: app)

        default:
            break // hands-free ignores releases
        }
    }

    /// Returns true if Escape was used to cancel (and should be swallowed).
    func escapePressed() -> Bool {
        guard isRecording else { return false }
        cancel()
        return true
    }

    // MARK: Session

    private func beginRecording(_ state: OverlayState) {
        engine.startRecording()
        overlay.model.modeName = modeName()
        overlay.show(state)
        levelTimer?.invalidate()
        levelTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            guard let self else { return }
            self.overlay.model.level = self.engine.inputLevel()
        }
    }

    private func stopMeter() {
        levelTimer?.invalidate()
        levelTimer = nil
        overlay.model.level = 0
    }

    private func cancel() {
        tapTimeout?.cancel()
        stopMeter()
        engine.cancelRecording()
        phase = .idle
        overlay.show(.hidden)
    }

    private func finish(app: String?) {
        stopMeter()
        phase = .processing
        overlay.show(.processing)
        let mode = currentMode
        queue.async { [engine] in
            let result = Result { try engine.stopAndProcess(modeId: mode, app: app) }
            DispatchQueue.main.async { self.deliver(result.map(\.output)) }
        }
    }

    private func finishCommand(selection: String, app: String?) {
        stopMeter()
        phase = .processing
        overlay.show(.processing)
        queue.async { [engine] in
            let result = Result { try engine.command(selection: selection, app: app) }
            // The selection is still active in the target app, so pasting replaces it.
            DispatchQueue.main.async { self.deliver(result) }
        }
    }

    private func deliver(_ result: Result<String, Error>) {
        phase = .idle
        switch result {
        case .success(let text) where text.isEmpty:
            overlay.show(.message(NSLocalizedString("Didn't catch that", comment: "Overlay, no speech recognized")), autoHideAfter: 1.2)
        case .success(let text):
            overlay.show(.hidden)
            TextInserter.paste(text)
        case .failure(let error):
            NSLog("[murmur] \(error)")
            let format = NSLocalizedString("Error: %@", comment: "Overlay; %@ is the error message")
            overlay.show(.message(String(format: format, "\(error)")), autoHideAfter: 3)
        }
    }
}
