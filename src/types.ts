export interface MidenClientOpts {
  endpoint?: string;
  nodeTransportUrl?: string;
  seed?: string;
}

export interface MidenAccountOpts {
  type: any;
  storageMode: any;
}
export type Opts = MidenClientOpts & MidenAccountOpts;
