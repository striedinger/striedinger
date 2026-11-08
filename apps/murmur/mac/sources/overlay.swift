import AppKit
import SwiftUI

enum OverlayState: Equatable {
    case hidden
    case listening(handsFree: Bool)
    case command
    case processing
    case message(String)
}

final class OverlayModel: ObservableObject {
    @Published var state: OverlayState = .hidden
    @Published var level: Float = 0
    @Published var modeName: String = ""
}

/// Small pill at the bottom of the screen. It's a non-activating panel, so it
/// never steals focus from the field you're dictating into.
final class OverlayController {
    let model = OverlayModel()
    private let panel: NSPanel
    private var hideWork: DispatchWorkItem?

    init() {
        panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 260, height: 44),
            styleMask: [.nonactivatingPanel, .borderless],
            backing: .buffered,
            defer: false
        )
        panel.isFloatingPanel = true
        panel.level = .statusBar
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = true
        panel.ignoresMouseEvents = true
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.contentView = NSHostingView(rootView: OverlayView(model: model))
    }

    func show(_ state: OverlayState, autoHideAfter: TimeInterval? = nil) {
        hideWork?.cancel()
        model.state = state
        if state == .hidden {
            panel.orderOut(nil)
            return
        }
        position()
        panel.orderFrontRegardless()
        if let delay = autoHideAfter {
            let work = DispatchWorkItem { [weak self] in self?.show(.hidden) }
            hideWork = work
            DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
        }
    }

    private func position() {
        let mouse = NSEvent.mouseLocation
        let screen = NSScreen.screens.first { $0.frame.contains(mouse) } ?? NSScreen.main
        guard let frame = screen?.visibleFrame else { return }
        let size = panel.frame.size
        panel.setFrameOrigin(NSPoint(x: frame.midX - size.width / 2, y: frame.minY + 48))
    }
}

struct OverlayView: View {
    @ObservedObject var model: OverlayModel

    var body: some View {
        HStack(spacing: 10) {
            indicator
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.primary)
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .frame(height: 36)
        .background(.regularMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(.white.opacity(0.12)))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder private var indicator: some View {
        switch model.state {
        case .listening, .command:
            LevelBars(level: model.level)
        case .processing:
            ProgressView().controlSize(.small)
        default:
            Image(systemName: "waveform").foregroundStyle(.secondary)
        }
    }

    private var label: String {
        switch model.state {
        case .hidden: return ""
        case .listening(let handsFree):
            return handsFree
                ? NSLocalizedString("Listening · tap ⌥ to finish", comment: "Overlay, hands-free dictation")
                : String(format: NSLocalizedString("Listening · %@", comment: "Overlay; %@ is the mode name"), model.modeName)
        case .command: return NSLocalizedString("Say an edit for the selection", comment: "Overlay, command mode")
        case .processing: return NSLocalizedString("Thinking…", comment: "Overlay, processing")
        case .message(let text): return text
        }
    }
}

private struct LevelBars: View {
    let level: Float
    private let weights: [Float] = [0.5, 0.8, 1.0, 0.8, 0.5]

    var body: some View {
        HStack(spacing: 2) {
            ForEach(weights.indices, id: \.self) { i in
                Capsule()
                    .fill(Color.red)
                    .frame(width: 3, height: CGFloat(4 + 14 * min(1, level * weights[i] * 1.6)))
            }
        }
        .frame(height: 18)
        .animation(.easeOut(duration: 0.08), value: level)
    }
}
