import {
  PluginExtensionAddedComponentConfig,
  PluginExtensionAddedLinkConfig,
} from '@grafana/data/src/types/pluginExtensions';
import { AppPluginConfig } from '@grafana/runtime';

import { isGrafanaDevMode } from './utils';

function ApplyInDevMode(target: any, key: string, descriptor: PropertyDescriptor) {
  const originalDef = descriptor.value;

  descriptor.value = function (...args: any[]) {
    return isGrafanaDevMode() && originalDef.apply(this, args);
  };
  return descriptor;
}

export class MetaValidator {
  constructor(private config: AppPluginConfig) {}

  @ApplyInDevMode
  addedComponentNotDefined(extension: PluginExtensionAddedComponentConfig): boolean {
    return !this.config.extensions.addedComponents.some(({ title }) => title === extension.title);
  }

  @ApplyInDevMode
  addedLinkNotDefined(extension: PluginExtensionAddedLinkConfig): boolean {
    return this.config.extensions.addedLinks.some(({ title }) => title === extension.title);
  }

  @ApplyInDevMode
  addedLinkTargetsNotDefined(extension: PluginExtensionAddedLinkConfig): boolean {
    const pluginJsonMeta = this.config.extensions.addedLinks.find(({ title }) => title === extension.title);
    const targets = Array.isArray(extension.targets) ? extension.targets : [extension.targets];
    return targets.every((target) => pluginJsonMeta?.targets.includes(target));
  }

  @ApplyInDevMode
  addedComponentTargetsNotDefined(extension: PluginExtensionAddedLinkConfig): boolean {
    const pluginJsonMeta = this.config.extensions.addedComponents.find(({ title }) => title === extension.title);
    const targets = Array.isArray(extension.targets) ? extension.targets : [extension.targets];
    return targets.every((target) => pluginJsonMeta?.targets.includes(target));
  }
}
