export interface MidenClientOpts {
  endpoint?: string;
  nodeTransportUrl?: string;
  seed?: string;
}

export type MidenAccountStorageMode = 'public' | 'private' | 'network';

export interface MidenAccountOpts {
  accountSeed?: string;
  type: import('@demox-labs/miden-sdk').AccountType;
  storageMode: MidenAccountStorageMode;
}
export type Opts = MidenClientOpts & MidenAccountOpts;
