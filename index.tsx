
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 實機 A/B（渲染優化輪的臨時診斷）：只有網址帶 phoneab 才載入
if (new URLSearchParams(location.search).has('phoneab')) {
  void import('./diagnostics/PhoneAB').then((m) => m.runPhoneAB());
}
