import { ReplaySubject } from 'rxjs';

import { IconName, PluginExtensionAddedLinkConfig } from '@grafana/data';
import { PluginAddedLinksConfigureFunc, PluginExtensionEventHelpers } from '@grafana/data/src/types/pluginExtensions';

import { MetaValidator } from '../MetaValidator';
import {
  DESCRIPTION_MISSING,
  INVALID_CONFIGURE_FN,
  INVALID_EXTENSION_TARGETS,
  INVALID_LINK_PATH,
  INVALID_PATH_OR_ONCLICK,
  MISSING_EXTENSION_META,
  TITLE_MISSING,
} from '../errors';
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
        errors.push(TITLE_MISSING);
      }

      if (!description) {
        errors.push(DESCRIPTION_MISSING);
      }

      if (!isConfigureFnValid(configure)) {
        errors.push(INVALID_CONFIGURE_FN);
      }

      if (!path && !onClick) {
        errors.push(INVALID_PATH_OR_ONCLICK);
      }

      if (path && !isLinkPathValid(pluginId, path)) {
        errors.push(INVALID_LINK_PATH);
      }

      // if (pluginId !== 'grafana' && isGrafanaDevMode() && isAddedLinkMetaInfoMissing(pluginId, config, configLog)) {
      //   configLog.warning(`Did not register links from plugin ${pluginId} due to missing meta information.`);
      //   continue;
      // }

      if (metaValidator.addedLinkNotDefined(config)) {
        errors.push(MISSING_EXTENSION_META(pluginId, 'Link'));
      }

      if (metaValidator.addedLinkTargetsNotDefined(config)) {
        errors.push(INVALID_EXTENSION_TARGETS);
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
