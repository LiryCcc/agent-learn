/* @refresh reload */
import AppProviders from '@/app/app-providers/index.jsx';
import '@fontsource-variable/roboto-mono';
import 'normalize.css';
import 'solid-devtools';
import { render } from 'solid-js/web';

const root = document.createElement('div');
root.id = 'app';
document.body.appendChild(root);

render(AppProviders, root);
