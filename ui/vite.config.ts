import { fileURLToPath, URL } from 'node:url';
// import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		devtools(),
		tanstackRouter({
			target: 'react',
			autoCodeSplitting: false,
		}),
		viteReact(),
		// tailwindcss(), // tw 4
		viteSingleFile(),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	build: {
		target: 'chrome86',
		cssTarget: 'chrome86',
		rollupOptions: {
			plugins: [
				visualizer({
					filename: 'dist/stats.html',
					gzipSize: true,
					brotliSize: true,
					open: false,
				}),
			],
		},
	},
	server: {
		allowedHosts: true,
	},
	preview: {
		allowedHosts: true,
	},
});
