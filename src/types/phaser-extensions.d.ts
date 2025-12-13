declare namespace Phaser {
  namespace Loader {
    interface LoaderPlugin {

      embeddedAtlas(key: string, url: string, xhrSettings?: Phaser.Types.Loader.XHRSettingsObject): Phaser.Loader.LoaderPlugin;
    }
  }
}