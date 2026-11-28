// One bundle holds all four iterations; index.html picks one from the URL.
import { start as board } from './iter1/index.js';
import { start as market } from './iter2/index.js';
import { start as dashboard } from './iter3/index.js';
import { start as terminal } from './iter4/index.js';

window.__start = { 1: board, 2: market, 3: dashboard, 4: terminal };
