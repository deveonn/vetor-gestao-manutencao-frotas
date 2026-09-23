import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.vetor.vistoria',
  appName: 'Vetor',
  webDir: 'dist/app/browser',
  plugins: {
    Keyboard: {
      // 'ionic'/'body' fazem resize via JS, pensados pra apps que usam <ion-content> — como este app
      // usa markup próprio (divs simples, sem ion-content), 'native' é o modo certo: deixa o próprio
      // Android encolher a WebView (via windowSoftInputMode="adjustResize" no AndroidManifest.xml).
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
