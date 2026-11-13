import Store from 'electron-store';

export interface AppStoreSchema {
  darkMode?: boolean;
}

export const appStore: Store<AppStoreSchema> = new Store();
