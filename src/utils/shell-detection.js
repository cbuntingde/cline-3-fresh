/**
 * Shell Detection Utility
 * 
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * Shell detection and command adaptation utility
 * MIT License
 */

/**
 * Shell information interface
 */
class ShellInfo {
    constructor(data) {
        this.platform = data.platform;
        this.shell = data.shell;
        this.shellType = data.shellType;
        this.shellPath = data.shellPath;
        this.supportsUnixCommands = data.supportsUnixCommands;
        this.isWindows = data.isWindows;
        this.isLinux = data.isLinux;
        this.isMac = data.isMac;
        this.isGitBash = data.isGitBash;
        this.isWSL = data.isWSL;
        this.isMingw = data.isMingw;
        this.isCygwin = data.isCygwin;
        this.shellEnv = data.shellEnv;
        this.comspec = data.comspec;
    }
}

/**
 * Shell Detector class for detecting the current shell environment
 */
class ShellDetector {
    /**
     * Detects the current shell environment and returns shell information
     * @returns {Promise<ShellInfo>} Shell detection result
     */
    static async detectShell() {
        const result = {
            platform: process.platform,
            shell: null,
            shellType: 'unknown',
            shellPath: null,
            supportsUnixCommands: false,
            isWindows: process.platform === 'win32',
            isLinux: process.platform === 'linux',
            isMac: process.platform === 'darwin',
            shellEnv: process.env.SHELL || null,
            comspec: process.env.COMSPEC || null,
            isGitBash: false,
            isWSL: false,
            isMingw: false,
            isCygwin: false
        };

        // Detect Git Bash on Windows
        if (result.isWindows) {
            if (result.shellEnv && result.shellEnv.includes('bash')) {
                result.isGitBash = true;
                result.shell = 'git-bash';
                result.shellType = 'bash';
                result.shellPath = result.shellEnv;
                result.supportsUnixCommands = true;
            }
            
            // Check for WSL
            if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
                result.isWSL = true;
                result.shell = 'wsl';
                result.shellType = 'bash';
                result.supportsUnixCommands = true;
            }
            
            // Check for MinGW/Cygwin
            if (process.env.MSYSTEM || (result.shellEnv && result.shellEnv.includes('mingw'))) {
                result.isMingw = true;
                result.shell = 'mingw';
                result.shellType = 'bash';
                result.shellPath = result.shellEnv;
                result.supportsUnixCommands = true;
            }
            
            if (process.env.CYGWIN || (result.shellEnv && result.shellEnv.includes('cygwin'))) {
                result.isCygwin = true;
                result.shell = 'cygwin';
                result.shellType = 'bash';
                result.shellPath = result.shellEnv;
                result.supportsUnixCommands = true;
            }
        }

        // Default shell detection
        if (!result.shell) {
            if (result.isWindows) {
                result.shell = 'cmd';
                result.shellType = 'cmd';
                result.shellPath = result.comspec;
                result.supportsUnixCommands = false;
            } else if (result.isLinux || result.isMac) {
                result.shell = 'bash';
                result.shellType = 'bash';
                result.shellPath = result.shellEnv;
                result.supportsUnixCommands = true;
            } else {
                result.shell = 'unknown';
                result.shellType = 'unknown';
                result.supportsUnixCommands = false;
            }
        }

        return new ShellInfo(result);
    }
}

/**
 * Command Adapter class for adapting commands to different shell environments
 */
class CommandAdapter {
    /**
     * Adapts a command for the current shell environment
     * @param {string} command - The command to adapt
     * @param {ShellInfo} shellInfo - Shell information from detectShell()
     * @returns {Promise<string>} The adapted command
     */
    static async adaptCommand(command, shellInfo) {
        if (!shellInfo) {
            throw new Error('Shell information is required');
        }

        // If we're in a Unix-like shell (bash, git-bash, mingw, cygwin, WSL)
        if (shellInfo.isGitBash || shellInfo.isMingw || shellInfo.isCygwin || 
            shellInfo.isWSL || shellInfo.isLinux || shellInfo.isMac) {
            return command; // Unix commands work as-is
        }

        // Windows CMD adaptations
        if (shellInfo.isWindows && shellInfo.shell === 'cmd') {
            // Convert common Unix commands to Windows equivalents
            const commandMap = {
                'ls': 'dir',
                'clear': 'cls',
                'pwd': 'cd',
                'cp': 'copy',
                'mv': 'move',
                'rm': 'del',
                'cat': 'type',
                'grep': 'findstr',
                'mkdir': 'mkdir',
                'rmdir': 'rmdir',
                'touch': 'echo. >'
            };

            // Simple command replacement (basic implementation)
            const firstWord = command.split(' ')[0];
            if (commandMap[firstWord]) {
                return command.replace(firstWord, commandMap[firstWord]);
            }
        }

        return command;
    }

    /**
     * Validates if a command is compatible with the current shell
     * @param {string} command - The command to validate
     * @param {ShellInfo} shellInfo - Shell information from detectShell()
     * @returns {Promise<boolean>} True if command is compatible
     */
    static async validateCommand(command, shellInfo) {
        if (!shellInfo || !command) {
            return false;
        }

        // Unix-like shells can handle most commands
        if (shellInfo.isGitBash || shellInfo.isMingw || shellInfo.isCygwin || 
            shellInfo.isWSL || shellInfo.isLinux || shellInfo.isMac) {
            return true;
        }

        // Windows CMD has limitations
        if (shellInfo.isWindows && shellInfo.shell === 'cmd') {
            // Check for obviously incompatible Unix commands
            const unixOnlyCommands = ['grep', 'awk', 'sed', 'find', 'xargs', 'tar', 'ssh', 'scp'];
            const firstWord = command.split(' ')[0];
            return !unixOnlyCommands.includes(firstWord);
        }

        return true;
    }

    /**
     * Checks if a command is safe to execute
     * @param {string} command - The command to check
     * @param {ShellInfo} shellInfo - Shell information from detectShell()
     * @returns {Promise<boolean>} True if command is safe
     */
    static async isCommandSafe(command, shellInfo) {
        if (!command || !shellInfo) {
            return false;
        }

        const dangerousPatterns = [
            /rm\s+-rf\s+\//,  // rm -rf /
            /del\s+\/s\/q\s+C:\\/,  // del /s /q C:\
            /format\s+c:/,  // format c:
            /shutdown\s+\/s/,  // shutdown /s
            /reboot/,  // reboot
            /halt/,  // halt
            /poweroff/,  // poweroff
            />\s*\/dev\/null/,  // redirect to /dev/null (potential data loss)
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Gets the appropriate command prefix for the current shell
     * @param {ShellInfo} shellInfo - Shell information from detectShell()
     * @returns {Promise<string>} Command prefix if needed
     */
    static async getCommandPrefix(shellInfo) {
        if (!shellInfo) {
            return '';
        }

        // Windows CMD doesn't need prefixes
        if (shellInfo.isWindows && shellInfo.shell === 'cmd') {
            return '';
        }

        // Unix-like shells don't need prefixes
        return '';
    }

    /**
     * Gets shell syntax information
     * @param {ShellInfo} shellInfo - Shell information from detectShell()
     * @returns {Promise<Object>} Shell syntax information
     */
    static async getShellSyntax(shellInfo) {
        if (!shellInfo) {
            return {
                pathSeparator: '/',
                commandSeparator: ';',
                commentPrefix: '#',
                environmentVarPrefix: '$'
            };
        }

        if (shellInfo.isWindows && shellInfo.shell === 'cmd') {
            return {
                pathSeparator: '\\',
                commandSeparator: '&',
                commentPrefix: 'REM',
                environmentVarPrefix: '%'
            };
        }

        // Unix-like shells
        return {
            pathSeparator: '/',
            commandSeparator: ';',
            commentPrefix: '#',
            environmentVarPrefix: '$'
        };
    }
}

module.exports = {
    ShellInfo,
    ShellDetector,
    CommandAdapter
};
