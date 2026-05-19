declare module 'better-sqlite3-session-store' {
  import { Store } from 'express-session';

  interface SqliteStoreOptions {
    client: unknown;
    expired?: { clear?: boolean; intervalMs?: number };
  }

  function createStore(session: typeof import('express-session')): new (options: SqliteStoreOptions) => Store;

  export default createStore;
}
