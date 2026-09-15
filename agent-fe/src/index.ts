/* @refresh reload */
import { render } from 'solid-js/web';
import './index.css';
import App from './app.jsx';

const root = document.createElement('div');
document.body.appendChild(root);

render(App, root);
