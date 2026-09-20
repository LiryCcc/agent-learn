import App from '@/app/index.jsx';
import { initializeApplication } from '@/app/initialize-application.js';
import '@fontsource-variable/roboto-mono';
import 'normalize.css';
import { createRoot } from 'react-dom/client';

initializeApplication();

const root = document.createElement('div');
root.id = 'app';
document.body.appendChild(root);

createRoot(root).render(<App />);
