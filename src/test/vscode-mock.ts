export const env = {
	machineId: 'test-machine-id',
}

export const workspace = {
	getConfiguration: () => ({
		get: () => 'all',
	}),
	onDidChangeConfiguration: () => ({ dispose: () => {} }),
}

export const window = {
	showWarningMessage: () => Promise.resolve(undefined),
	createTextEditorDecorationType: () => ({}),
}

export const commands = {
	executeCommand: () => Promise.resolve(),
}
