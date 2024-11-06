import { ReplaySubject } from 'rxjs';

import { PluginExtensionAddedComponentConfig } from '@grafana/data';

import { ExtensionsErrorMessages, ExtensionsType } from '../ExtensionsErrorMessages';
import { ExtensionsValidator } from '../ExtensionsValidator';
import { DESCRIPTION_MISSING, INVALID_EXTENSION_TARGETS, MISSING_EXTENSION_META, TITLE_MISSING } from '../errors';
import { wrapWithPluginContext } from '../utils';
import { extensionPointEndsWithVersion, isGrafanaCoreExtensionPoint } from '../validators';

import { PluginExtensionConfigs, Registry, RegistryType } from './Registry';

export type AddedComponentRegistryItem<Props = {}> = {
  pluginId: string;
  title: string;
  description: string;
  component: React.ComponentType<Props>;
};

export class AddedComponentsRegistry extends Registry<
  AddedComponentRegistryItem[],
  PluginExtensionAddedComponentConfig
> {
  constructor(
    options: {
      registrySubject?: ReplaySubject<RegistryType<AddedComponentRegistryItem[]>>;
      initialState?: RegistryType<AddedComponentRegistryItem[]>;
    } = {}
  ) {
    super(options);
  }

  mapToRegistry(
    registry: RegistryType<AddedComponentRegistryItem[]>,
    item: PluginExtensionConfigs<PluginExtensionAddedComponentConfig>
  ): RegistryType<AddedComponentRegistryItem[]> {
    const { pluginId, configs } = item;

    for (const config of configs) {
      const metaValidator = new ExtensionsValidator(pluginId);
      const errors = new ExtensionsErrorMessages(ExtensionsType.AddedComponents, pluginId);
      const configLog = this.logger.child({
        description: config.description,
        title: config.title,
        pluginId,
      });

      if (!config.title) {
        errors.addTitleMissingError();
      }

      if (!config.description) {
        errors.addDescriptionMissingError();
      }

      if (metaValidator.addedComponentNotDefined(config)) {
        errors.addMissingExtensionMetaError();
      }

      if (metaValidator.addedComponentTargetsNotDefined(config)) {
        errors.addInvalidExtensionTargetsError();
      }

      if (errors.hasErrors) {
        configLog.error(errors.getLogMessage());
        continue;
      }

      const extensionPointIds = Array.isArray(config.targets) ? config.targets : [config.targets];
      for (const extensionPointId of extensionPointIds) {
        const pointIdLog = configLog.child({ extensionPointId });

        if (!isGrafanaCoreExtensionPoint(extensionPointId) && !extensionPointEndsWithVersion(extensionPointId)) {
          pointIdLog.warning(
            `It's recommended to suffix the extension point id ("${extensionPointId}") with a version, e.g 'myorg-basic-app/extension-point/v1'.`
          );
        }

        const result = {
          pluginId,
          component: wrapWithPluginContext(pluginId, config.component, pointIdLog),
          description: config.description,
          title: config.title,
        };

        pointIdLog.debug(`Component extension successfully registered.`);

        if (!(extensionPointId in registry)) {
          registry[extensionPointId] = [result];
        } else {
          registry[extensionPointId].push(result);
        }
      }
    }

    return registry;
  }

  // Returns a read-only version of the registry.
  readOnly() {
    return new AddedComponentsRegistry({
      registrySubject: this.registrySubject,
    });
  }
}
