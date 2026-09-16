/* @refresh reload */
import AppProviders from '@/app/app-providers/index.jsx';
import { initializeColorTheme } from '@/utils/color-theme.js';
import '@fontsource-variable/roboto-mono';
import 'normalize.css';
import 'solid-devtools';
import { render } from 'solid-js/web';

initializeColorTheme();

const root = document.createElement('div');
root.id = 'app';
document.body.appendChild(root);

render(AppProviders, root);
