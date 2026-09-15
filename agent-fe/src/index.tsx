/* @refresh reload */
import { render } from 'solid-js/web';
import 'normalize.css';
import AppProviders from '@/app/app-providers/index.jsx';

const root = document.createElement('div');
root.id = 'app';
document.body.appendChild(root);

render(AppProviders, root);
