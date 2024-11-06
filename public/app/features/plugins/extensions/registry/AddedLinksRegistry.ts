import { ReplaySubject } from 'rxjs';

import { IconName, PluginExtensionAddedLinkConfig } from '@grafana/data';
import { PluginAddedLinksConfigureFunc, PluginExtensionEventHelpers } from '@grafana/data/src/types/pluginExtensions';

import { ExtensionsErrorMessages, ExtensionsType } from '../ExtensionsErrorMessages';
import { ExtensionsValidator } from '../ExtensionsValidator';
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
      const metaValidator = new ExtensionsValidator(pluginId);
      const errors = new ExtensionsErrorMessages(ExtensionsType.AddedLinks, pluginId);
      const { path, title, description, configure, onClick, targets } = config;
      const configLog = this.logger.child({
        path: path ?? '',
        description,
        title,
        pluginId,
        onClick: typeof onClick,
      });

      if (!title) {
        errors.addTitleMissingError();
      }

      if (!description) {
        errors.addDescriptionMissingError();
      }

      if (!isConfigureFnValid(configure)) {
        errors.addInvalidConfigureFnError();
      }

      if (!path && !onClick) {
        errors.addInvalidPathOrOnClickError();
      }

      if (path && !isLinkPathValid(pluginId, path)) {
        errors.addInvalidLinkPathError();
      }

      if (metaValidator.addedLinkNotDefined(config)) {
        errors.addMissingExtensionMetaError();
      }

      if (metaValidator.addedLinkTargetsNotDefined(config)) {
        errors.addInvalidExtensionTargetsError();
      }

      if (errors.hasErrors) {
        configLog.error(errors.getLogMessage());
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
