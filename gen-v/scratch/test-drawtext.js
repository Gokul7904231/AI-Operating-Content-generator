const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const fontPath = "C\\:/Windows/Fonts/arial.ttf";
const outputPath = path.join(__dirname, 'test_output.mp4');

// Escape Windows path colon and drawtext narrative
const drawTextFilter = `drawtext=fontfile='${fontPath}':text='Hello World quiz':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2`;

const args = [
  "-f", "lavfi", "-i", `color=c=0x1E1E2E:s=1080x1920:d=3`,
  "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
  "-vf", drawTextFilter,
  "-c:v", "libx264",
  "-t", "3",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac",
  "-y",
  outputPath
];

const result = spawnSync("C:\\Users\\ASUS\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe", args, { encoding: 'utf8' });
console.log('Exit Code:', result.status);
if (result.status !== 0) {
  console.log('Stderr:', result.stderr);
} else {
  console.log('Success! Output size:', fs.statSync(outputPath).size);
}
