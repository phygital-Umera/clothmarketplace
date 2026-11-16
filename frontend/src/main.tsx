import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './assets/css/style.css';
import {APP_NAME} from './lib/appName';

// The tab title follows VITE_APP_NAME (P4-10)
document.title = APP_NAME;

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
