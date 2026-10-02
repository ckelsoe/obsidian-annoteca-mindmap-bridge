/** @type {import('jest').Config} */
module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts'],
	// TypeScript first. Jest's default order puts `js` ahead of `ts`, and the
	// build writes `main.js` next to `main.ts`, so a test importing `../main`
	// would silently run the last build instead of the source.
	moduleFileExtensions: ['ts', 'js', 'mjs', 'cjs', 'json', 'node'],
	transform: {
		'^.+\\.ts$': ['ts-jest', {
			tsconfig: {
				// Override ESNext module to CommonJS for Jest compatibility
				module: 'CommonJS',
			},
		}],
	},
};
