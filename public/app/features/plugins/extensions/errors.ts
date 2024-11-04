export const MISSING_EXTENSION_POINT_META_INFO =
  'Invalid extension point. Reason: The extension point is not declared in the "plugin.json" file. Extension points must be listed in the section "extensions.extensionPoints[]". Returning an empty array of extensions.';

export const INVALID_EXTENSION_POINT_ID = (pluginId: string, extensionPointId: string) =>
  `Invalid extension point. Reason: Extension point id should be prefixed with your plugin id, e.g "${pluginId}/${extensionPointId}".`;
