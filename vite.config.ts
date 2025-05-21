import { defineConfig, loadEnv, Rollup, UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { minifyJsonPlugin } from "./src/plugins/vite/vite-minify-json-plugin";

function enhancedDebuggingPlugin(): Plugin {
  const moduleOrder: string[] = [];
  const moduleDependencies: Record<string, string[]> = {};
  const circularDependencies: string[] = [];

  return {
    name: 'enhanced-debugging',
    resolveId(source, importer) {
      if (importer) {
        if (!moduleDependencies[importer]) {
          moduleDependencies[importer] = [];
        }
        moduleDependencies[importer].push(source);

        if (moduleDependencies[source] && moduleDependencies[source].includes(importer)) {
          circularDependencies.push(`${importer} <-> ${source}`);
        }
      }
      return null;
    },
    load(id) {
      moduleOrder.push(id);
      return null;
    },
    buildEnd() {
      console.log('Module initialization order:');
      moduleOrder.forEach((module, index) => {
        console.log(`${index + 1}. ${module}`);
      });

      console.log('\nModule dependencies:');
      Object.entries(moduleDependencies).forEach(([module, dependencies]) => {
        console.log(`${module}:`);
        dependencies.forEach(dep => console.log(`  - ${dep}`));
      });

      if (circularDependencies.length > 0) {
        console.log('\nCircular dependencies detected:');
        circularDependencies.forEach(dep => console.log(dep));
      }
    }
  };
}

export const defaultConfig: UserConfig  = {
	plugins: [
		tsconfigPaths(),
    minifyJsonPlugin(["images", "battle-anims"], true),
    enhancedDebuggingPlugin() // Add the new debugging plugin
	],
		resolve: {
			alias: {
				'#enums': '/src/enums',
				'#app': '/src',
				'#test': '/src/test'
			}
		},
		optimizeDeps: {
			esbuildOptions: {
				target: 'es2020',
			},
		},
		esbuild: {
			target: 'es2020',
		},
	clearScreen: false,
	appType: "mpa",
	build: {
		minify: 'esbuild',
		sourcemap: false,
		rollupOptions: {
			onwarn(warning: Rollup.RollupLog, defaultHandler: (warning: string | Rollup.RollupLog) => void) {
				if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
					return;
				}
				defaultHandler(warning);
			},
		},
	},
};


export default defineConfig(({mode}) => {
	const envPort = Number(loadEnv(mode, process.cwd()).VITE_PORT);

    console.log('Vite config loaded');
    console.log('Plugins:', defaultConfig.plugins.map(p => p.name));

	return ({
		...defaultConfig,
		esbuild: {
			pure: mode === 'production' ? ['console.log'] : [],
			keepNames: true,
		},
		server: {
			port: !isNaN(envPort) ? envPort : 8000,
    },
    build: {
      ...defaultConfig.build,
      rollupOptions: {
        ...defaultConfig.build?.rollupOptions,
        onwarn(warning: Rollup.RollupLog, defaultHandler: (warning: string | Rollup.RollupLog) => void) {
          console.warn('Rollup warning:', warning);

          if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
            return;
		}
          defaultHandler(warning);
        },
      },
    },
	});
});
