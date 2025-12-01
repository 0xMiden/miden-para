# miden-para

The Miden x Para SDK integration

## Requirements

- **Yarn 1.22.22** (enforced via `packageManager` field)
- Node.js (compatible with your project)

This project uses Yarn 1.22.22. The version is locked in `package.json` and will be automatically enforced by modern package managers that support the `packageManager` field.

## Installation

```bash
yarn install
```

## Building

```bash
yarn build
```

## Local Development & Testing

If you want to test local changes to this package with `@getpara/react-sdk` (or any other Para SDK), you can override the npm-published version using `yarn link`:

### Step 1: Link this package locally

In this repository directory:

```bash
# Build the package
yarn build

# Create a global symlink
yarn link
```

### Step 2: Use the linked package in your project

In your project that uses `@getpara/react-sdk`:

```bash
# Link to the local version
yarn link "@getpara/viem-v2-integration"

# Install other dependencies normally
yarn install
```

### Step 3: Develop and test

Any changes you make to this package:

```bash
# In viem-v2-integration directory
yarn build

# Your linked project will automatically use the updated build
```

### Step 4: Unlink when done

In your project:

```bash
# Remove the link and restore the npm version
yarn unlink "@getpara/viem-v2-integration"
yarn install --force
```

## Notes

- This package depends on `@getpara/core-sdk` at version `2.0.0-alpha.64`
- Ensure your project's SDK versions are compatible when using `yarn link`
- The `react-sdk` from npm should work seamlessly with a locally-linked version of this package
