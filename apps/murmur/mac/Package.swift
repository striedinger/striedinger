// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Murmur",
    platforms: [.macOS(.v13)],
    targets: [
        .systemLibrary(name: "murmur_coreFFI", path: "generated/ffi"),
        .target(name: "MurmurCore", dependencies: ["murmur_coreFFI"], path: "generated/swift"),
        .executableTarget(name: "Murmur", dependencies: ["MurmurCore"], path: "sources"),
    ],
    swiftLanguageVersions: [.v5]
)
