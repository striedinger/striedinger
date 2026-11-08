import AppKit
import MurmurCore
import AVFoundation
import ApplicationServices

final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var statusItem: NSStatusItem!
    private let overlay = OverlayController()
    private let hotkeys = HotkeyMonitor()
    private var engine: Engine?
    private var controller: DictationController?
    private var modes: [ModeInfo] = []
    private var statusText = NSLocalizedString("Loading models…", comment: "Menu status while starting")
    private var permissionTimer: Timer?

    private let dataDir: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("Murmur", isDirectory: true)
    }()

    private var savedMode: String? {
        get { UserDefaults.standard.string(forKey: "mode") }
        set { UserDefaults.standard.set(newValue, forKey: "mode") }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        statusItem.button?.image = NSImage(systemSymbolName: "waveform", accessibilityDescription: "Murmur")
        // The menu is rebuilt only when it opens, so dictation never pays for
        // a history query or menu rebuild.
        let menu = NSMenu()
        menu.delegate = self
        statusItem.menu = menu

        requestPermissions()
        loadEngine()
    }

    // MARK: Setup

    private func requestPermissions() {
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            if !granted { NSLog("[murmur] microphone access denied") }
        }
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        _ = AXIsProcessTrustedWithOptions(options)
    }

    private func loadEngine() {
        try? FileManager.default.createDirectory(at: dataDir, withIntermediateDirectories: true)
        let path = dataDir.path
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let engine = try Engine(dataDir: path)
                DispatchQueue.main.async { self.engineReady(engine) }
            } catch {
                NSLog("[murmur] \(error)")
                DispatchQueue.main.async {
                    let format = NSLocalizedString("Setup error: %@", comment: "Menu status; %@ is the error")
                    self.statusText = String(format: format, "\(error)")
                }
            }
        }
    }

    private func engineReady(_ engine: Engine) {
        self.engine = engine
        modes = engine.modes()
        let mode = savedMode.flatMap { id in modes.first { $0.id == id }?.id } ?? engine.defaultMode()

        let controller = DictationController(engine: engine, overlay: overlay, mode: mode)
        controller.modeName = { [weak self, weak controller] in
            self?.modes.first { $0.id == controller?.currentMode }.map { NSLocalizedString($0.name, comment: "Mode name") } ?? ""
        }
        self.controller = controller

        hotkeys.onPress = { [weak controller] shift in controller?.keyPressed(shiftHeld: shift) }
        hotkeys.onRelease = { [weak controller] in controller?.keyReleased() }
        hotkeys.onEscape = { [weak controller] in controller?.escapePressed() ?? false }
        startHotkeys()
    }

    /// The event tap fails until Accessibility is granted, so retry until it works.
    private func startHotkeys() {
        if hotkeys.start() {
            permissionTimer?.invalidate()
            permissionTimer = nil
            statusText = engine?.llmAvailable() ?? false
                ? NSLocalizedString("Ready · hold Right ⌥ to talk", comment: "Menu status")
                : NSLocalizedString("Ready (cleanup model off)", comment: "Menu status")
            return
        }
        statusText = NSLocalizedString("Grant Accessibility in System Settings → Privacy & Security", comment: "Menu status")
        guard permissionTimer == nil else { return }
        permissionTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            self?.startHotkeys()
        }
    }

    // MARK: Menu

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        let status = NSMenuItem(title: statusText, action: nil, keyEquivalent: "")
        status.isEnabled = false
        menu.addItem(status)
        menu.addItem(.separator())

        if let engine, let controller {
            let modeMenu = NSMenu()
            for mode in modes {
                // Default mode names are translated; custom names have no catalog entry and show as written.
                let title = NSLocalizedString(mode.name, comment: "Mode name")
                let item = NSMenuItem(title: title, action: #selector(selectMode(_:)), keyEquivalent: "")
                item.target = self
                item.representedObject = mode.id
                item.state = mode.id == controller.currentMode ? .on : .off
                item.isEnabled = !mode.usesLlm || engine.llmAvailable()
                modeMenu.addItem(item)
            }
            let modeItem = NSMenuItem(title: NSLocalizedString("Mode", comment: "Menu"), action: nil, keyEquivalent: "")
            modeItem.submenu = modeMenu
            menu.addItem(modeItem)

            let recent = engine.recentHistory(limit: 10)
            let historyMenu = NSMenu()
            let rawFormat = NSLocalizedString("Raw: %@", comment: "History tooltip; %@ is the raw transcript")
            for entry in recent {
                let title = entry.output.count > 60 ? String(entry.output.prefix(60)) + "…" : entry.output
                let item = NSMenuItem(title: title, action: #selector(copyHistory(_:)), keyEquivalent: "")
                item.target = self
                item.representedObject = entry.output
                item.toolTip = String(format: rawFormat, entry.raw)
                historyMenu.addItem(item)
            }
            if recent.isEmpty {
                let empty = NSMenuItem(title: NSLocalizedString("Nothing yet", comment: "Empty history"), action: nil, keyEquivalent: "")
                empty.isEnabled = false
                historyMenu.addItem(empty)
            }
            let historyItem = NSMenuItem(
                title: NSLocalizedString("Recent (click to copy)", comment: "Menu"), action: nil, keyEquivalent: "")
            historyItem.submenu = historyMenu
            menu.addItem(historyItem)
            menu.addItem(.separator())
        }

        menu.addItem(item(NSLocalizedString("Open Settings…", comment: "Menu"), #selector(openSettings), ","))
        menu.addItem(item(NSLocalizedString("Reload Settings", comment: "Menu"), #selector(reloadSettings), "r"))
        menu.addItem(item(NSLocalizedString("Open Models Folder", comment: "Menu"), #selector(openModels), ""))
        menu.addItem(.separator())
        menu.addItem(item(NSLocalizedString("Quit Murmur", comment: "Menu"), #selector(quit), "q"))
    }

    private func item(_ title: String, _ action: Selector, _ key: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
        item.target = self
        return item
    }

    @objc private func selectMode(_ sender: NSMenuItem) {
        guard let id = sender.representedObject as? String else { return }
        controller?.currentMode = id
        savedMode = id
    }

    @objc private func copyHistory(_ sender: NSMenuItem) {
        guard let text = sender.representedObject as? String else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
    }

    @objc private func openSettings() {
        let config = dataDir.appendingPathComponent("config.toml")
        if FileManager.default.fileExists(atPath: config.path) {
            NSWorkspace.shared.open(config)
        } else {
            NSWorkspace.shared.open(dataDir)
        }
    }

    @objc private func reloadSettings() {
        guard let engine else { loadEngine(); return }
        do {
            try engine.reloadConfig()
            modes = engine.modes()
            statusText = NSLocalizedString("Settings reloaded", comment: "Menu status")
        } catch {
            let format = NSLocalizedString("Settings error: %@", comment: "Menu status; %@ is the error")
            statusText = String(format: format, "\(error)")
        }
    }

    @objc private func openModels() {
        let models = dataDir.appendingPathComponent("models", isDirectory: true)
        try? FileManager.default.createDirectory(at: models, withIntermediateDirectories: true)
        NSWorkspace.shared.open(models)
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}
