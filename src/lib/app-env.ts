const normalizedEnv = (process.env.ENV ?? '').trim().toLowerCase();

export const APP_ENV = normalizedEnv;

export function isTestesPageEnabled(): boolean {
  return ['test', 'teste', 'development', 'desenvolvimento', 'dev'].includes(APP_ENV);
}
