export interface MidenClientOpts {
  endpoint?: string;
  nodeTransportUrl?: string;
  seed?: string;
}

export interface MidenAccountOpts {
  accountSeed?: string;
  type: import('@demox-labs/miden-sdk').AccountType;
  storageMode: 'public' | 'private' | 'network';
}
export type Opts = MidenClientOpts & MidenAccountOpts;
