import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { KitchenProvider } from './kitchen/KitchenProvider';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <KitchenProvider>
          <App />
        </KitchenProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
