// The shared SDK resolver is identical for apps and SDK component tests.
const sdkRoot = new URL("../sdk", import.meta.url).pathname;
export const sdkAliases = [
	{ find: /^@sdk\/([^/]+)$/, replacement: `${sdkRoot}/$1/src/mod.ts` },
	{ find: /^@sdk\/(.*)/, replacement: `${sdkRoot}/$1` },
	{ find: /^@sdk$/, replacement: `${sdkRoot}/mod.ts` },
];
