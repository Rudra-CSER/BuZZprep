/**
 * Domain vocabulary shared by the server, the web app and the config-bundle format, grouped by
 * domain and re-exported from the package root.
 * Keep these lists append-only where possible: values are persisted in MongoDB.
 */
export * from './schedule';
export * from './reminders';
export * from './learning';
export * from './career';
export * from './journal';
export * from './account';
