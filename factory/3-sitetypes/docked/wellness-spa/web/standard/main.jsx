import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './style-import.css';
import './dock-connector.js';

async function init() {
  const data = {};
  // Dummy data loading logic for local development
  try {
    {{DATA_LOADING_LOGIC}}
  } catch (e) {
    console.error("Data laad fout:", e);
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App data={data} />
    </React.StrictMode>
  );
}

init();
