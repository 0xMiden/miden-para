# Miden + Para React example

This example shows how to wire the Para React SDK and `miden-para-react` into a Vite + React app, connect a wallet with Para's modal, and run a Miden flow (consuming all consumable notes for the connected account).

- React 19 + Vite starter with TanStack Query and basic Node polyfills for browser usage
- Para provider and hooks for wallet connection and account data
- `useParaMiden` helper to bootstrap the Miden WebClient against `https://rpc.testnet.miden.io`
- Sample `consumeAllNotes` action that reads notes and submits a consume transaction

## Prerequisites
- Node.js 18+ and Yarn or npm
- A Para API key (create one in the Para dashboard)

## Setup
1) Install dependencies  
`yarn install`  
or  
`npm install`

2) Add your Para API key to `.env.local` (or any Vite-supported env file in the project root):
```
VITE_PARA_API_KEY=your_api_key_here
```

3) Start the dev server  
`yarn dev`  
or  
`npm run dev`

Build, preview, and lint:
- `yarn build` / `npm run build`
- `yarn preview` / `npm run preview`
- `yarn lint` / `npm run lint`

## How the integration works
- `src/components/ConsumeAllNotes.tsx` wraps the app with `ParaProvider`, supplying your API key and a friendly app name.
- The component uses `useParaMiden('https://rpc.testnet.miden.io')` to initialize the Miden WebClient via Para, and exposes the current `accountId`, Para client instance, and EVM wallets.
- `useModal` and `useAccount` from `@getpara/react-sdk` drive the "Connect Wallet" button and connection state, while `useWallet` surfaces the connected address.
- `consumeAllNotes` dynamically imports `@demox-labs/miden-sdk`, syncs state, fetches consumable notes for the connected account, and submits a consume transaction.
- `vite.config.ts` keeps the Miden SDK unbundled (so WASM assets resolve) and applies Node polyfills (`Buffer`, `process`) for browser compatibility via `src/polyfills.ts`.

## Using this in your app
- Reuse `ParaProvider` near the root of your app and pass your own `apiKey` and `config.appName`.
- Point `useParaMiden` to the Miden RPC you need (the sample uses testnet).
- Replace `consumeAllNotes` with your own business logic: mint notes, transfer them, or consume specific notes by ID.
- Keep the Vite polyfill setup (or an equivalent) if you depend on Node globals in the browser.
