import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'meu-financeiro-build-version',
      generateBundle(){
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({version: String(Date.now())})
        });
      }
    }
  ],
  // Diagnóstico temporário: preserva nomes de componentes/funções
  // para que erros em produção apontem o arquivo e o componente reais.
  build: {
    minify: false,
    sourcemap: true
  }
});
