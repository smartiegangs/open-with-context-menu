const { spawn } = require('child_process');
const path = require('path');

/**
 * Launches an external application with a file on the current platform
 * @param {string} appName - Application name (for macOS app bundle, Windows/Linux executable name)
 * @param {string} appPath - Full path to application executable (optional, takes precedence over appName)
 * @param {string} filePath - Path to the file to open
 * @returns {Promise<void>}
 */
function launchApp(appName, appPath, filePath) {
  if (!appName && !appPath) {
    return Promise.reject(new Error('Either appName or appPath must be provided'));
  }

  const normalizedFilePath = path.normalize(filePath);
  const platform = process.platform;
  let command;
  let args;
  let fallbackToXdgOpen = false;

  if (platform === 'darwin') {
    command = 'open';
    args = ['-a', appPath || appName, normalizedFilePath];
  } else {
    command = appPath || appName;
    args = [normalizedFilePath];
    fallbackToXdgOpen = platform === 'linux' && !appPath && Boolean(appName);
    if (platform === 'win32' && !appPath && !command.toLowerCase().endsWith('.exe')) {
      command += '.exe';
    }
  }

  return spawnApplication(command, args, fallbackToXdgOpen, normalizedFilePath);
}

function spawnApplication(command, args, fallbackToXdgOpen, filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore'
    });
    let settled = false;

    child.once('error', error => {
      if (fallbackToXdgOpen && error.code === 'ENOENT') {
        spawnApplication('xdg-open', [filePath], false, filePath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (!settled) {
        settled = true;
        reject(new Error(`Failed to launch application: ${error.message}`));
      }
    });

    child.once('spawn', () => {
      settled = true;
      child.unref();
      resolve();
    });
  });
}

module.exports = {
  launchApp
};
