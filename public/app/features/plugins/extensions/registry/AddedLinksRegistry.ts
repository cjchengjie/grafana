import { ReplaySubject } from 'rxjs';

import { IconName, PluginExtensionAddedLinkConfig } from '@grafana/data';
import { PluginAddedLinksConfigureFunc, PluginExtensionEventHelpers } from '@grafana/data/src/types/pluginExtensions';

import { MetaValidator } from '../MetaValidator';
import { isAddedLinkMetaInfoMissing, isGrafanaDevMode } from '../utils';
import {
  extensionPointEndsWithVersion,
  isConfigureFnValid,
  isGrafanaCoreExtensionPoint,
  isLinkPathValid,
} from '../validators';

import { PluginExtensionConfigs, Registry, RegistryType } from './Registry';

export type AddedLinkRegistryItem<Context extends object = object> = {
  pluginId: string;
  extensionPointId: string;
  title: string;
  description: string;
  path?: string;
  onClick?: (event: React.MouseEvent | undefined, helpers: PluginExtensionEventHelpers<Context>) => void;
  configure?: PluginAddedLinksConfigureFunc<Context>;
  icon?: IconName;
  category?: string;
};

export class AddedLinksRegistry extends Registry<AddedLinkRegistryItem[], PluginExtensionAddedLinkConfig> {
  constructor(
    options: {
      registrySubject?: ReplaySubject<RegistryType<AddedLinkRegistryItem[]>>;
      initialState?: RegistryType<AddedLinkRegistryItem[]>;
    } = {}
  ) {
    super(options);
  }

  mapToRegistry(
    registry: RegistryType<AddedLinkRegistryItem[]>,
    item: PluginExtensionConfigs<PluginExtensionAddedLinkConfig>
  ): RegistryType<AddedLinkRegistryItem[]> {
    const { pluginId, configs } = item;

    for (const config of configs) {
      const errors: string[] = [];
      const metaValidator = new MetaValidator(pluginId);
      const { path, title, description, configure, onClick, targets } = config;
      const configLog = this.logger.child({
        path: path ?? '',
        description,
        title,
        pluginId,
        onClick: typeof onClick,
      });

      if (!title) {
        errors.push(`* Title is missing.`);
      }

      if (!description) {
        errors.push(`* Description is missing.`);
      }

      if (!isConfigureFnValid(configure)) {
        errors.push(`* The provided "configure" is not a function.`);
      }

      if (!path && !onClick) {
        errors.push(`* Either "path" or "onClick" is required.`);
      }

      if (path && !isLinkPathValid(pluginId, path)) {
        errors.push(`* The "path" is required and should start with "/a/${pluginId}/".`);
      }

      if (pluginId !== 'grafana' && isGrafanaDevMode() && isAddedLinkMetaInfoMissing(pluginId, config, configLog)) {
        configLog.warning(`Did not register links from plugin ${pluginId} due to missing meta information.`);
        continue;
      }

      if (metaValidator.addedLinkNotDefined(config)) {
        errors.push(
          `* The extension was not declared in the plugin.json of "${pluginId}". Added link extensions must be listed in the section "extensions.addedLinks[]".`
        );
      }

      if (metaValidator.addedLinkTargetsNotDefined(config)) {
        errors.push(`* The "targets" property is missing in the added links configuration.`);
      }

      if (errors.length > 0) {
        configLog.error(`Could not register link extension. Reasons: \n${errors.join('\n')}`);
        continue;
      }

      const extensionPointIds = Array.isArray(targets) ? targets : [targets];
      for (const extensionPointId of extensionPointIds) {
        const pointIdLog = configLog.child({ extensionPointId });

        if (!isGrafanaCoreExtensionPoint(extensionPointId) && !extensionPointEndsWithVersion(extensionPointId)) {
          pointIdLog.warning(
            `It's recommended to suffix the extension point id ("${extensionPointId}") with a version, e.g 'myorg-basic-app/extension-point/v1'.`
          );
        }

        const { targets, ...registryItem } = config;

        if (!(extensionPointId in registry)) {
          registry[extensionPointId] = [];
        }

        pointIdLog.debug(`Link extension successfully registered.`);

        registry[extensionPointId].push({ ...registryItem, pluginId, extensionPointId });
      }
    }

    return registry;
  }

  // Returns a read-only version of the registry.
  readOnly() {
    return new AddedLinksRegistry({
      registrySubject: this.registrySubject,
    });
  }
}
