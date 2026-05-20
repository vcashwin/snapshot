# Publishing `@paper-snapshot/*` to npm

## One-time setup

1. Create the npm org **`paper-snapshot`** (free for public packages):  
   https://www.npmjs.com/org/create

2. Log in: `npm login`

3. Publish:

```bash
pnpm build
pnpm publish:packages --otp=YOUR_6_DIGIT_CODE
```

## Verify

```bash
npm view @paper-snapshot/core version
npm view @paper-snapshot/core repository homepage bugs
```

npm package pages show **Repository**, **Homepage**, and **Issues** links from these `package.json` fields. After changing them, bump the version and republish.

## Install (any package manager)

```bash
pnpm add @paper-snapshot/core @paper-snapshot/react
npm install @paper-snapshot/core
yarn add @paper-snapshot/core
```
