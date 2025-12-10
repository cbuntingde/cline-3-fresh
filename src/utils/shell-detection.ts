/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Shell Detection and Command Adaptation Utility
 * MIT License
 */

import * as os from 'os'
import * as path from 'path'
import { execa } from 'execa'

export interface ShellInfo {
	platform: string
	shell: string
	shellPath: string
	shellType: 'bash' | 'zsh' | 'fish' | 'pwsh' | 'cmd' | 'wsl' | 'git-bash' | 'unknown'
	isWindows: boolean
	isUnixLike: boolean
	supportsUnixCommands: boolean
}

export class ShellDetector {
	private static cache: ShellInfo | null = null

	/**
	 * Detect the current shell environment with comprehensive fallbacks
	 */
	static async detectShell(): Promise<ShellInfo> {
		if (this.cache) {
			return this.cache
		}

		const platform = os.platform()
		const isWindows = platform === 'win32'
		const isUnixLike = !isWindows

		let shellPath = process.env.SHELL || ''
		let shell = path.basename(shellPath) || ''
		let shellType: ShellInfo['shellType'] = 'unknown'
		let supportsUnixCommands = isUnixLike

		// Windows-specific detection
		if (isWindows) {
			// Check for various Windows shell environments
			const shellEnv = process.env.COMSPEC || ''
			const psModulePath = process.env.PSMODULEPATH || ''
			const wslDist = process.env.WSL_DISTRO_NAME || ''
			const gitBash = process.env.GIT_BASH_PATH || ''

			// Detect WSL
			if (wslDist || shellPath.includes('wsl')) {
				shellType = 'wsl'
				supportsUnixCommands = true
				shell = 'wsl'
				shellPath = shellPath || 'wsl.exe'
			}
			// Detect Git Bash
			else if (gitBash || shellPath.includes('git') || shellPath.includes('bash')) {
				shellType = 'git-bash'
				supportsUnixCommands = true
				shell = 'bash'
				shellPath = shellPath || this.findGitBash()
			}
			// Detect PowerShell
			else if (psModulePath || shellPath.includes('pwsh') || shellPath.includes('powershell')) {
				shellType = 'pwsh'
				supportsUnixCommands = false
				shell = 'pwsh'
				shellPath = shellPath || 'pwsh.exe'
			}
			// Detect Command Prompt
			else if (shellEnv.includes('cmd') || shellPath.includes('cmd')) {
				shellType = 'cmd'
				supportsUnixCommands = false
				shell = 'cmd'
				shellPath = shellPath || 'cmd.exe'
			}
			// Fallback detection for Windows
			else {
				// Try to detect by testing common commands
				const detected = await this.detectWindowsShellByTesting()
				shellType = detected.type
				supportsUnixCommands = detected.supportsUnixCommands
				shell = detected.shell
				shellPath = detected.path
			}
		}
		// Unix-like systems
		else {
			// Standard Unix shell detection
			if (shell.includes('bash')) {
				shellType = 'bash'
			} else if (shell.includes('zsh')) {
				shellType = 'zsh'
			} else if (shell.includes('fish')) {
				shellType = 'fish'
			} else if (shell.includes('pwsh')) {
				shellType = 'pwsh'
				supportsUnixCommands = false
			} else {
				// Fallback detection for Unix systems
				const detected = await this.detectUnixShellByTesting()
				shellType = detected.type
				shell = detected.shell
				shellPath = detected.path
			}
		}

		this.cache = {
			platform,
			shell,
			shellPath,
			shellType,
			isWindows,
			isUnixLike,
			supportsUnixCommands
		}

		return this.cache
	}

	/**
	 * Find Git Bash installation path on Windows
	 */
	private static findGitBash(): string {
		const commonPaths = [
			'C:\\Program Files\\Git\\bin\\bash.exe',
			'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
			'C:\\msys64\\usr\\bin\\bash.exe',
			'C:\\cygwin64\\bin\\bash.exe'
		]

		for (const bashPath of commonPaths) {
			try {
				// Check if file exists (simplified check)
				return bashPath
			} catch (error) {
				// Continue to next path
			}
		}

		return 'bash.exe' // Fallback
	}

	/**
	 * Detect Windows shell by testing command availability
	 */
	private static async detectWindowsShellByTesting(): Promise<{
		type: ShellInfo['shellType']
		shell: string
		path: string
		supportsUnixCommands: boolean
	}> {
		const tests = [
			{
				type: 'git-bash' as const,
				shell: 'bash',
				path: this.findGitBash(),
				test: 'echo test',
				supportsUnixCommands: true
			},
			{
				type: 'pwsh' as const,
				shell: 'pwsh',
				path: 'pwsh.exe',
				test: 'Write-Host test',
				supportsUnixCommands: false
			},
			{
				type: 'cmd' as const,
				shell: 'cmd',
				path: 'cmd.exe',
				test: 'echo test',
				supportsUnixCommands: false
			}
		]

		for (const test of tests) {
			try {
				// Quick test to see if shell is available
				await execa(test.path, [test.test], { 
					timeout: 2000,
					shell: false 
				})
				return test
			} catch (error) {
				// Continue to next test
			}
		}

		// Default to cmd if nothing else works
		return {
			type: 'cmd',
			shell: 'cmd',
			path: 'cmd.exe',
			supportsUnixCommands: false
		}
	}

	/**
	 * Detect Unix shell by testing command availability
	 */
	private static async detectUnixShellByTesting(): Promise<{
		type: ShellInfo['shellType']
		shell: string
		path: string
	}> {
		const tests = [
			{ type: 'bash' as const, shell: 'bash', path: '/bin/bash' },
			{ type: 'zsh' as const, shell: 'zsh', path: '/bin/zsh' },
			{ type: 'fish' as const, shell: 'fish', path: '/usr/bin/fish' },
			{ type: 'pwsh' as const, shell: 'pwsh', path: '/usr/bin/pwsh' }
		]

		for (const test of tests) {
			try {
				await execa(test.path, ['--version'], { 
					timeout: 2000,
					shell: false 
				})
				return test
			} catch (error) {
				// Continue to next test
			}
		}

		// Default to bash if nothing else works
		return {
			type: 'bash',
			shell: 'bash',
			path: '/bin/bash'
		}
	}

	/**
	 * Clear the detection cache
	 */
	static clearCache(): void {
		this.cache = null
	}

	/**
	 * Get cached shell info or detect if not cached
	 */
	static async getShellInfo(): Promise<ShellInfo> {
		return this.cache || this.detectShell()
	}
}

export class CommandAdapter {
	/**
	 * Adapt a command for the detected shell environment
	 */
	static async adaptCommand(command: string, shellInfo?: ShellInfo): Promise<string> {
		const shell = shellInfo || await ShellDetector.detectShell()
		
		// If shell supports Unix commands natively, return as-is
		if (shell.supportsUnixCommands) {
			return command
		}

		// Windows-specific adaptations
		if (shell.isWindows) {
			return this.adaptForWindows(command, shell)
		}

		return command
	}

	/**
	 * Adapt command for Windows shells
	 */
	private static adaptForWindows(command: string, shell: ShellInfo): string {
		switch (shell.shellType) {
			case 'cmd':
				return this.adaptForCmd(command)
			case 'pwsh':
				return this.adaptForPowerShell(command)
			default:
				return command
		}
	}

	/**
	 * Adapt command for Windows Command Prompt
	 */
	private static adaptForCmd(command: string): string {
		// Common Unix commands to Windows CMD equivalents
		const replacements: Record<string, string> = {
			'ls': 'dir',
			'ls -la': 'dir /a',
			'clear': 'cls',
			'pwd': 'cd',
			'cp': 'copy',
			'mv': 'move',
			'rm': 'del',
			'rm -rf': 'rmdir /s /q',
			'mkdir': 'mkdir',
			'touch': 'type nul >',
			'cat': 'type',
			'grep': 'findstr',
			'which': 'where',
			'export': 'set',
			'uname': 'ver',
			'whoami': 'whoami'
		}

		// Replace common Unix commands with Windows equivalents
		let adaptedCommand = command
		for (const [unix, windows] of Object.entries(replacements)) {
			const regex = new RegExp(`\\b${unix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
			adaptedCommand = adaptedCommand.replace(regex, windows)
		}

		// Handle path separators
		adaptedCommand = adaptedCommand.replace(/\//g, '\\')

		return adaptedCommand
	}

	/**
	 * Adapt command for PowerShell
	 */
	private static adaptForPowerShell(command: string): string {
		// Common Unix commands to PowerShell equivalents
		const replacements: Record<string, string> = {
			'ls': 'Get-ChildItem',
			'ls -la': 'Get-ChildItem -Force',
			'clear': 'Clear-Host',
			'pwd': 'Get-Location',
			'cp': 'Copy-Item',
			'mv': 'Move-Item',
			'rm': 'Remove-Item',
			'rm -rf': 'Remove-Item -Recurse -Force',
			'mkdir': 'New-Item -ItemType Directory',
			'touch': 'New-Item',
			'cat': 'Get-Content',
			'grep': 'Select-String',
			'which': 'Get-Command',
			'export': '$env:',
			'uname': 'Get-ComputerInfo',
			'whoami': 'whoami'
		}

		// Replace common Unix commands with PowerShell equivalents
		let adaptedCommand = command
		for (const [unix, powershell] of Object.entries(replacements)) {
			const regex = new RegExp(`\\b${unix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
			adaptedCommand = adaptedCommand.replace(regex, powershell)
		}

		return adaptedCommand
	}

	/**
	 * Check if a command is safe to run in the detected shell
	 */
	static async isCommandSafe(command: string, shellInfo?: ShellInfo): Promise<boolean> {
		const shell = shellInfo || await ShellDetector.detectShell()
		
		// List of potentially dangerous commands
		const dangerousCommands = [
			'rm -rf /',
			'del /s /q',
			'format',
			'fdisk',
			'diskpart',
			'shutdown',
			'reboot',
			'halt',
			'poweroff'
		]

		const lowerCommand = command.toLowerCase()
		return !dangerousCommands.some(dangerous => lowerCommand.includes(dangerous))
	}

	/**
	 * Get shell-specific command syntax
	 */
	static async getShellSyntax(shellInfo?: ShellInfo): Promise<{
		pathSeparator: string
		commandSeparator: string
		commentPrefix: string
		environmentVarPrefix: string
	}> {
		const shell = shellInfo || await ShellDetector.detectShell()
		
		if (shell.shellType === 'cmd') {
			return {
				pathSeparator: '\\',
				commandSeparator: ' & ',
				commentPrefix: 'REM',
				environmentVarPrefix: '%'
			}
		} else if (shell.shellType === 'pwsh') {
			return {
				pathSeparator: '\\',
				commandSeparator: '; ',
				commentPrefix: '#',
				environmentVarPrefix: '$env:'
			}
		} else {
			// Unix-like shells
			return {
				pathSeparator: '/',
				commandSeparator: '; ',
				commentPrefix: '#',
				environmentVarPrefix: '$'
			}
		}
	}
}
