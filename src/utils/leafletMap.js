import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createStoreMap } from './storeMapController.js';

export const mountStoreMap = (host, options) => createStoreMap(L, host, options);
