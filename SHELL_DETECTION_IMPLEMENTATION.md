# Shell Detection and Command Adaptation System

## Overview

This implementation provides a robust cross-platform shell detection and command adaptation system that automatically detects the current shell environment and adapts commands accordingly. This solves the critical issue where Windows commands don't work on Linux and vice versa, while also handling special cases like Git Bash, MinGW, Cygwin, and WSL.

## Features

### 🔍 Shell Detection
- **Platform Detection**: Automatically detects Windows, Linux, and macOS
- **Shell Type Identification**: Identifies CMD, PowerShell, Bash, Git Bash, MinGW, Cygwin, WSL
- **Capability Assessment**: Determines if the shell supports Unix commands
- **Path Resolution**: Gets the actual shell executable path

### 🔄 Command Adaptation
- **Automatic Translation**: Converts Unix commands to Windows equivalents when needed
- **Safety Validation**: Checks for dangerous commands before execution
- **Syntax Compatibility**: Ensures commands use the correct syntax for the detected shell
- **Preservation**: Leaves commands unchanged when they're already compatible

### 🛡️ Safety Features
- **Dangerous Command Detection**: Identifies potentially harmful commands
- **Input Validation**: Validates command syntax and structure
- **Error Handling**: Graceful error handling with informative messages

## Implementation Details

### Core Classes

#### `ShellInfo`
Contains comprehensive information about the detected shell environment:
```javascript
{
    platform: 'win32' | 'linux' | 'darwin',
    shell: 'cmd' | 'powershell' | 'bash' | 'git-bash' | 'mingw' | 'cygwin' | 'wsl',
    shellType: 'cmd' | 'powershell' | 'bash',
    shellPath: string,
    supportsUnixCommands: boolean,
    isWindows: boolean,
    isLinux: boolean,
    isMac: boolean,
    isGitBash: boolean,
    isWSL: boolean,
    isMingw: boolean,
    isCygwin: boolean
}
```

#### `ShellDetector`
Static class for detecting shell environments:
- `detectShell()`: Main detection method
- Analyzes environment variables and platform indicators
- Returns a `ShellInfo` object with comprehensive data

#### `CommandAdapter`
Static class for adapting commands:
- `adaptCommand(command, shellInfo)`: Adapts commands for the target shell
- `validateCommand(command, shellInfo)`: Checks command compatibility
- `isCommandSafe(command, shellInfo)`: Validates command safety
- `getShellSyntax(shellInfo)`: Returns shell-specific syntax information

### Detection Logic

#### Windows Detection
1. **Git Bash**: Checks for `bash` in `SHELL` environment variable
2. **MinGW**: Checks `MSYSTEM` environment variable or `mingw` in shell path
3. **Cygwin**: Checks `CYGWIN` environment variable or `cygwin` in shell path
4. **WSL**: Checks `WSL_DISTRO_NAME` or `WSLENV` environment variables
5. **CMD/PowerShell**: Default Windows shells

#### Unix Detection
1. **Linux/macOS**: Default to bash with Unix command support
2. **Shell Path**: Uses `SHELL` environment variable for executable path

### Command Adaptation Rules

#### Unix to Windows (CMD)
- `ls` → `dir`
- `clear` → `cls`
- `pwd` → `cd`
- `cp` → `copy`
- `mv` → `move`
- `rm` → `del`
- `cat` → `type`
- `grep` → `findstr`

#### Unix-Compatible Shells
- Git Bash, MinGW, Cygwin, WSL: No adaptation needed
- Linux/macOS: No adaptation needed
- Commands remain unchanged

## Integration with Task System

The shell detection system is integrated into the task execution pipeline:

1. **Pre-execution Detection**: Shell is detected before each command execution
2. **Command Adaptation**: Commands are automatically adapted if needed
3. **Safety Validation**: Commands are validated for safety before execution
4. **Error Handling**: Detailed error messages for incompatible commands

### Usage Example

```javascript
import { ShellDetector, CommandAdapter } from './src/utils/shell-detection.js';

// Detect current shell
const shellInfo = await ShellDetector.detectShell();

// Adapt a command
const originalCommand = 'ls -la';
const adaptedCommand = await CommandAdapter.adaptCommand(originalCommand, shellInfo);

// Check if command is safe
const isSafe = await CommandAdapter.isCommandSafe(adaptedCommand, shellInfo);

if (isSafe) {
    // Execute the adapted command
    await executeCommand(adaptedCommand);
}
```

## Testing

### Test Coverage
- ✅ Shell detection on Windows with Git Bash
- ✅ Shell detection on Windows with CMD
- ✅ Shell detection on Linux/macOS
- ✅ Command adaptation for different shells
- ✅ Dangerous command detection
- ✅ Safety validation
- ✅ Syntax compatibility

### Test Files
- `test-shell-detection.js`: Basic shell detection tests
- `test-cross-platform.js`: Comprehensive cross-platform tests

## Supported Environments

### Windows
- ✅ CMD (Command Prompt)
- ✅ PowerShell
- ✅ Git Bash
- ✅ MinGW/MSYS2
- ✅ Cygwin
- ✅ WSL (Windows Subsystem for Linux)

### Linux
- ✅ Bash
- ✅ Zsh
- ✅ Fish
- ✅ Other Unix-like shells

### macOS
- ✅ Bash
- ✅ Zsh (default since Catalina)
- ✅ Other Unix-like shells

## Error Handling

### Common Scenarios
1. **Unknown Shell**: Gracefully handles unknown shell types
2. **Missing Environment Variables**: Uses sensible defaults
3. **Invalid Commands**: Provides clear error messages
4. **Dangerous Commands**: Blocks execution with warnings

### Error Messages
- Clear, actionable error messages
- Suggestions for command alternatives
- Shell-specific guidance when available

## Performance Considerations

- **Detection Caching**: Shell detection results can be cached for performance
- **Lazy Loading**: Command adaptation only when needed
- **Minimal Overhead**: Fast detection and adaptation process
- **Memory Efficient**: Lightweight classes and methods

## Future Enhancements

### Planned Features
- [ ] PowerShell command adaptation
- [ ] Remote shell detection (SSH)
- [ ] Container environment detection
- [ ] Custom shell profiles
- [ ] Command suggestion system
- [ ] Performance metrics collection

### Extensibility
- Plugin architecture for custom shells
- Configurable command mappings
- Custom safety rules
- Integration with other tools

## Security Considerations

### Safety Measures
- Command validation before execution
- Dangerous command detection
- Input sanitization
- Error message sanitization

### Best Practices
- Always validate commands before execution
- Use the safety checks provided
- Handle errors gracefully
- Log security-relevant events

## Conclusion

This shell detection and command adaptation system provides a robust solution for cross-platform command execution. It automatically handles the complexities of different shell environments, ensuring that commands work correctly regardless of the underlying platform or shell type.

The system is designed to be:
- **Reliable**: Works consistently across different environments
- **Safe**: Includes comprehensive safety checks
- **Extensible**: Easy to add support for new shells
- **Performant**: Minimal overhead for detection and adaptation
- **Maintainable**: Clean, well-documented code

By integrating this system into the task execution pipeline, we eliminate the common issues that arise from running commands on incompatible shells, providing a seamless experience for users across all platforms.
