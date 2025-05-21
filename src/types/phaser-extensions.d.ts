declare namespace Phaser {
  namespace Loader {
    interface LoaderPlugin {
      /**
       * Loads a texture atlas where the JSON data is embedded in the PNG file.
       * 
       * @param key The key to use for this atlas in the texture manager
       * @param url The URL of the PNG file with embedded JSON data
       * @param xhrSettings Optional XHR settings for the file load
       */
      embeddedAtlas(key: string, url: string, xhrSettings?: Phaser.Types.Loader.XHRSettingsObject): Phaser.Loader.LoaderPlugin;
    }
  }
} 