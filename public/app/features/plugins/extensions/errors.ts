export const MISSING_EXTENSION_POINT_META_INFO =
  'Invalid extension point. Reason: The extension point is not declared in the "plugin.json" file. Extension points must be listed in the section "extensions.extensionPoints[]". Returning an empty array of extensions.';

export const INVALID_EXTENSION_POINT_ID = (pluginId: string, extensionPointId: string) =>
  `Invalid extension point. Reason: Extension point id should be prefixed with your plugin id, e.g "${pluginId}/${extensionPointId}".`;

export const MISSING_EXTENSION_META = (pluginId: string, extensionType: 'Link' | 'Component') => {
  const type = extensionType === 'Link' ? 'Added link' : 'Added component';
  const sectionName = extensionType === 'Link' ? 'extensions.addedLinks[]' : 'extensions.addedComponents[]';
  return `The extension was not declared in the plugin.json of "${pluginId}". ${type} extensions must be listed in the section "${sectionName}".`;
};

export const INVALID_EXTENSION_TARGETS = 'The "targets" property is missing in the component configuration.';
export const TITLE_MISSING = 'Title is missing.';
export const DESCRIPTION_MISSING = 'Description is missing.';
export const INVALID_CONFIGURE_FN = 'Invalid "configure" function. It should be a function.';
export const INVALID_PATH_OR_ONCLICK = 'You need to provide either "path" or "onClick".';
export const INVALID_LINK_PATH = 'The "path" is required and should start with "/a/{pluginId}/".';
