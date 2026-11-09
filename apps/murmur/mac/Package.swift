// swift-tools-version:5.9
// The Murmur menu bar app as a Swift package, so it builds with `swift build` on macOS
// and, through xtool's Darwin Swift SDK, on Linux. scripts/build-mac.sh generates the
// UniFFI bindings into generated/ before building, and assembles the .app afterwards.
import PackageDescription

let package = Package(
    name: "Murmur",
    platforms: [.macOS(.v13)],
    targets: [
        // C header + module map for the Rust library (libmurmur_core.dylib).
        .systemLibrary(name: "murmur_coreFFI", path: "generated/ffi"),
        // UniFFI's generated Swift wrapper around that C API.
        .target(name: "MurmurCore", dependencies: ["murmur_coreFFI"], path: "generated/swift"),
        .executableTarget(name: "Murmur", dependencies: ["MurmurCore"], path: "sources"),
    ],
    swiftLanguageVersions: [.v5]
)
