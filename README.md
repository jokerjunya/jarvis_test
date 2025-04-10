# EchoSphere - 音声認識チャットアプリ

レスポンシブなReactコンポーネントを使用した音声認識と合成をサポートするチャットアプリケーションです。

## 機能

- Web Speech APIを使用した音声認識（ja-JP）
- 音声合成による応答の読み上げ
- チャット形式のUI
- レスポンシブデザイン（モバイルとデスクトップに対応）
- APIエンドポイントとの連携

## 技術スタック

- React
- TypeScript
- Tailwind CSS
- Vite
- Web Speech API

## 開始方法

1. リポジトリをクローンします
```bash
git clone <リポジトリURL>
cd jarvis_test
```

2. 依存関係をインストールします
```bash
npm install
```

3. 開発サーバーを起動します
```bash
npm run dev
```

4. ブラウザで `http://localhost:5173` にアクセスします

## 注意事項

- 音声認識機能は、Chrome、Edge、Safariなどの一部のブラウザのみでサポートされています
- マイクへのアクセス許可が必要です
- ja-JP言語パックがサポートされているブラウザが必要です

## デプロイ

このアプリケーションはNetlifyにデプロイできます：

```bash
npm run build
```

生成された `dist` フォルダをNetlifyにデプロイします。

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
