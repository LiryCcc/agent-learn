import AppProviders from '@/app/app-providers/index.jsx';
import '@fontsource-variable/roboto-mono';
import 'normalize.css';
import { createRoot } from 'react-dom/client';

const root = document.createElement('div');
root.id = 'app';
document.body.appendChild(root);

createRoot(root).render(<AppProviders />);
