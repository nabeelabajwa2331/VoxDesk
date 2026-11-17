import type { VoxDeskApi } from './contract';
import { httpApi } from './http';
import { mockApi } from '../mocks/mockApi';

export const USING_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export const api: VoxDeskApi = USING_MOCKS ? mockApi : httpApi;

export * from './contract';
export * from './errors';
