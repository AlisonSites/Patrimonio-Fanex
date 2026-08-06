import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function runBuild() {
  try {
    console.log('Iniciando build...');
    await build({
      root: __dirname,
      configFile: resolve(__dirname, 'vite.config.js'),
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
      }
    });
    console.log('Build concluído com sucesso!');
  } catch (error) {
    console.error('Erro no build:', error);
    process.exit(1);
  }
}

runBuild();