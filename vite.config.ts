import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
    plugins: [
        dts({
            rollupTypes: true,
            include: ['src'],
        }),
    ],
    build: {
        minify: false,
        copyPublicDir: false,
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['es'],
        },
        rollupOptions: {
            external: ['vue', 'axios'],
            output: {
                assetFileNames: 'assets/[name][extname]',
                entryFileNames: '[name].js',
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve('src/'),
        },
    },
    define: {
        // https://vitest.dev/guide/in-source.html
        // For the production build, you will need to set the define options in your config file,
        // letting the bundler do the dead code elimination.
        'import.meta.vitest': 'undefined',
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    test: {
        deps: {
            inline: ['lodash-es'],
        },
        includeSource: ['src/**/*.{js,ts}'],
        include: ['./src/**/*.spec.ts'],
    },
})
