/**
 * Marks where a tool screen's navigation bar holds actions a client page adds. It lives apart
 * from `IosToolActions` so the server-rendered screen imports a string, not a client reference.
 */
export const iosToolActionsSlot = "data-ios-tool-actions";
