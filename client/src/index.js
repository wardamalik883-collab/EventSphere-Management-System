/**
 * index.js — React application entry point
 *
 * Renders the React root into the #root DOM element.
 * Wraps App in React.StrictMode for development-time warnings.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
