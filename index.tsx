
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// `?ui-gallery`：元件樣張頁掛在獨立的 root，疊在遊戲上方。一般情況不載入這份程式碼。
if (new URLSearchParams(window.location.search).has('ui-gallery')) {
  void import('./components/ui/primitives/Gallery').then(({ Gallery }) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    ReactDOM.createRoot(host).render(
      <React.StrictMode>
        <Gallery />
      </React.StrictMode>
    );
  });
}

// 實機 A/B（HANDOFF I-2 的臨時診斷，用完刪除）：只有網址帶 phoneab 才載入
if (new URLSearchParams(window.location.search).has('phoneab')) {
  void import('./diagnostics/PhoneAB').then((m) => m.runPhoneAB());
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
