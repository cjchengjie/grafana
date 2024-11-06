export enum ExtensionsType {
  AddedComponents = 'addedComponents',
  AddedLinks = 'addedLinks',
  ExposedComponents = 'exposedComponents',
}

export class ExtensionsErrorMessages {
  errors: string[];
  extensionTypeFriendlyName: string;
  sectionName: string;
  constructor(
    private extensionType: ExtensionsType,
    private pluginId: string
  ) {
    this.errors = [];
    switch (this.extensionType) {
      case ExtensionsType.AddedLinks:
        this.extensionTypeFriendlyName = 'Added link';
        this.sectionName = 'extensions.addedLinks[]';
        break;
      case ExtensionsType.AddedComponents:
        this.extensionTypeFriendlyName = 'Added component';
        this.sectionName = 'extensions.addedComponents[]';
        break;
      default:
        this.extensionTypeFriendlyName = 'Exposed component';
        this.sectionName = 'extensions.exposedComponents[]';
        break;
    }
  }

  get hasErrors() {
    return this.errors.length > 0;
  }

  addMissingExtensionMetaError() {
    this.errors.push(
      `The extension was not declared in the plugin.json of "${this.pluginId}". ${this.extensionTypeFriendlyName} extensions must be listed in the section "${this.sectionName}".`
    );
  }

  addTitleMismatchError() {
    this.errors.push(
      `The title of the ${this.extensionTypeFriendlyName} does not match the title specified in the plugin.json file.`
    );
  }

  addInvalidExtensionTargetsError() {
    this.errors.push('The "targets" property is missing in the component configuration.');
  }

  addInvalidExposedComponentIdError() {
    this.errors.push(
      "The component id does not match the id naming convention. Id should be prefixed with plugin id. e.g 'myorg-basic-app/my-component-id/v1'."
    );
  }

  addExposedComponentAlreadyExistsError() {
    this.errors.push('An exposed component with the same id already exists.');
  }

  addTitleMissingError() {
    this.errors.push('Title is missing.');
  }

  addDescriptionMissingError() {
    this.errors.push('Description is missing.');
  }

  addInvalidConfigureFnError() {
    this.errors.push('Invalid "configure" function. It should be a function.');
  }

  addInvalidPathOrOnClickError() {
    this.errors.push('You need to provide either "path" or "onClick".');
  }

  addInvalidLinkPathError() {
    this.errors.push('The "path" is required and should start with "/a/{pluginId}/".');
  }

  addMissingExtensionPointMetaInfoError() {
    this.errors.push(
      'Invalid extension point. Reason: The extension point is not declared in the "plugin.json" file. Extension points must be listed in the section "extensions.extensionPoints[]". Returning an empty array of extensions.'
    );
  }

  addInvalidExtensionPointIdError(extensionPointId: string) {
    this.errors.push(
      `Extension point id should be prefixed with your plugin id, e.g "${this.pluginId}/${extensionPointId}".`
    );
  }

  getLogMessage() {
    return `Could not register ${this.extensionTypeFriendlyName.toLocaleLowerCase()} extension. Reasons: \n${this.errors.join('\n')}`;
  }
}
