//! Generates Swift (and later C#/Kotlin) bindings from a compiled `murmur-core` library.
//!
//! It lives in its own crate so that generating bindings needs only `UniFFI`, not the
//! core's native dependencies. That matters when cross-compiling the core for macOS
//! from Linux: the generator runs on the host and reads the macOS dylib's metadata.

fn main() {
    uniffi::uniffi_bindgen_main();
}
