import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	define: {
		'process.env': {},
		process: { env: {} }
	},
	server: {
		host: true,
		proxy: {
			'/api/resend': {
				target: 'https://api.resend.com',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/resend/, ''),
			},
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@app': path.resolve(__dirname, './src/app'),
			'@core': path.resolve(__dirname, './src/core'),
			'@shared': path.resolve(__dirname, './src/shared'),
			'@systems': path.resolve(__dirname, './src/systems'),
			'next/navigation': path.resolve(__dirname, './src/lib/next-navigation-shim.ts'),
			'next/link': path.resolve(__dirname, './src/lib/next-navigation-shim.ts')
		}
	}
});
