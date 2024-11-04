import { PluginContextType } from '@grafana/data';

// Checks if the meta information is missing from the plugin's plugin.json file
export const isExtensionPointMetaInfoMissing = (extensionPointId: string, pluginContext: PluginContextType) => {
  const extensionPoints = pluginContext.meta?.extensions?.extensionPoints;
  return !extensionPoints || !extensionPoints.some((ep) => ep.id === extensionPointId);
};

// Checks if an exposed component that the plugin is depending on is missing from the `dependencies` in the plugin.json file
export const isExposedComponentDependencyMissing = (id: string, pluginContext: PluginContextType) => {
  const exposedComponentsDependencies = pluginContext.meta?.dependencies?.extensions?.exposedComponents;

  return !exposedComponentsDependencies || !exposedComponentsDependencies.includes(id);
};
