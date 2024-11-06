import { ReplaySubject } from 'rxjs';

import { PluginExtensionAddedComponentConfig } from '@grafana/data';

import { MetaValidator } from '../MetaValidator';
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
      const errors: string[] = [];
      const metaValidator = new MetaValidator(pluginId);
      const configLog = this.logger.child({
        description: config.description,
        title: config.title,
        pluginId,
      });

      if (!config.title) {
        errors.push(TITLE_MISSING);
      }

      if (!config.description) {
        errors.push(DESCRIPTION_MISSING);
      }

      if (metaValidator.addedComponentNotDefined(config)) {
        errors.push(MISSING_EXTENSION_META(pluginId, 'Component'));
      }

      if (metaValidator.addedComponentTargetsNotDefined(config)) {
        errors.push(INVALID_EXTENSION_TARGETS);
      }

      if (errors.length > 0) {
        configLog.error(`Could not register component extension. Reasons: \n${errors.join('\n')}`);
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
