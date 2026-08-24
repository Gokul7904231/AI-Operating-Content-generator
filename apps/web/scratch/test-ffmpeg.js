const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

let _resolvedFfmpegPath = null;

function resolveFFmpegPath() {
  if (_resolvedFfmpegPath) return _resolvedFfmpegPath;

  // 1. Try default system PATH first
  try {
    const checkCmd = process.platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    execSync(checkCmd, { stdio: "ignore" });
    _resolvedFfmpegPath = "ffmpeg";
    return "ffmpeg";
  } catch {}

  // 2. Try looking in Winget Links directory (User AppData)
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (home && process.platform === "win32") {
    const wingetLink = path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Links", "ffmpeg.exe");
    if (fs.existsSync(wingetLink)) {
      _resolvedFfmpegPath = wingetLink;
      return wingetLink;
    }

    // Search winget Packages folders
    const wingetPackagesDir = path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Packages");
    if (fs.existsSync(wingetPackagesDir)) {
      try {
        const pkgs = fs.readdirSync(wingetPackagesDir);
        for (const pkg of pkgs) {
          if (pkg.toLowerCase().includes("gyan.ffmpeg")) {
            const binDir = path.join(wingetPackagesDir, pkg, "ffmpeg-8.1.2-full_build", "bin", "ffmpeg.exe");
            if (fs.existsSync(binDir)) {
              _resolvedFfmpegPath = binDir;
              return binDir;
            }
          }
        }
      } catch (err) {}
    }
  }

  _resolvedFfmpegPath = "ffmpeg";
  return "ffmpeg";
}

const ffmpegCmd = resolveFFmpegPath();
console.log('Resolved FFmpeg Path:', ffmpegCmd);

try {
  const result = spawnSync(ffmpegCmd, ['-version'], { encoding: 'utf8' });
  console.log('Exit Code:', result.status);
  console.log('Stdout:', result.stdout ? result.stdout.slice(0, 100) : 'None');
  console.log('Stderr:', result.stderr ? result.stderr.slice(0, 100) : 'None');
  console.log('Error:', result.error);
} catch (e) {
  console.error('Execution Failed:', e.message);
}
