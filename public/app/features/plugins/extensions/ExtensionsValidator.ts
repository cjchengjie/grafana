import { PluginContextType } from '@grafana/data';
import {
  PluginExtensionAddedComponentConfig,
  PluginExtensionAddedLinkConfig,
  PluginExtensionExposedComponentConfig,
} from '@grafana/data/src/types/pluginExtensions';
import { AppPluginConfig, config } from '@grafana/runtime';

import { isGrafanaDevMode } from './utils';

export class ExtensionsValidator {
  config?: AppPluginConfig;
  enableRestrictions: boolean;

  constructor(
    private pluginId: string,
    private additionalRestrictionsEnabled?: boolean
  ) {
    this.config = config.apps[pluginId];
    this.enableRestrictions = isGrafanaDevMode();
    if (this.additionalRestrictionsEnabled !== undefined) {
      this.enableRestrictions = this.enableRestrictions && this.additionalRestrictionsEnabled;
    }
  }

  addedComponentNotDefined(extension: PluginExtensionAddedComponentConfig): boolean {
    return (
      this.pluginId !== 'grafana' &&
      !this.enableRestrictions &&
      !!!this.config?.extensions.addedComponents.some(({ title }) => title === extension.title)
    );
  }

  addedComponentTargetsNotDefined(extension: PluginExtensionAddedLinkConfig): boolean {
    const pluginJsonMeta = this.config?.extensions.addedComponents.find(({ title }) => title === extension.title);
    const targets = Array.isArray(extension.targets) ? extension.targets : [extension.targets];
    return (
      this.pluginId !== 'grafana' &&
      !this.enableRestrictions &&
      !targets.every((target) => pluginJsonMeta?.targets.includes(target))
    );
  }

  exposedComponentNotDefined(extension: PluginExtensionExposedComponentConfig): boolean {
    return (
      this.pluginId !== 'grafana' &&
      !this.enableRestrictions &&
      !!!this.config?.extensions.exposedComponents.some(({ title }) => title === extension.title)
    );
  }

  exposedComponentTitlesNotMatching(extension: PluginExtensionExposedComponentConfig): boolean {
    const pluginJsonMeta = this.config?.extensions.exposedComponents.find(({ title }) => title === extension.title);
    return this.pluginId !== 'grafana' && !this.enableRestrictions && pluginJsonMeta?.title !== extension.title;
  }

  addedLinkNotDefined(extension: PluginExtensionAddedLinkConfig): boolean {
    return (
      this.pluginId !== 'grafana' &&
      !this.enableRestrictions &&
      !!!this.config?.extensions.addedLinks.some(({ title }) => title === extension.title)
    );
  }

  addedLinkTargetsNotDefined(extension: PluginExtensionAddedLinkConfig): boolean {
    const pluginJsonMeta = this.config?.extensions.addedLinks.find(({ title }) => title === extension.title);
    const targets = Array.isArray(extension.targets) ? extension.targets : [extension.targets];
    return (
      this.pluginId !== 'grafana' &&
      !this.enableRestrictions &&
      !targets.every((target) => pluginJsonMeta?.targets.includes(target))
    );
  }

  isExtensionPointIdInvalid(extensionPointId: string): boolean {
    if (!extensionPointId.startsWith('grafana/')) {
      return true;
    }

    return !Boolean(
      extensionPointId.startsWith(`plugins/${this.pluginId}/`) || extensionPointId.startsWith(`${this.pluginId}/`)
    );
  }

  isExtensionPointMetaInfoMissing(extensionPointId: string, pluginContext: PluginContextType | null): boolean {
    const extensionPoints = pluginContext?.meta?.extensions?.extensionPoints;
    return !extensionPoints || !extensionPoints.some((ep) => ep.id === extensionPointId);
  }
}
