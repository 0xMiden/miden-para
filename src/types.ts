export interface MidenClientOpts {
  endpoint?: string;
  nodeTransportUrl?: string;
  seed?: string;
}

export interface MidenAccountOpts {
  type: import("@demox-labs/miden-sdk").AccountType;
  storageMode: import("@demox-labs/miden-sdk").AccountStorageMode;
}
export type Opts = MidenClientOpts & MidenAccountOpts;
