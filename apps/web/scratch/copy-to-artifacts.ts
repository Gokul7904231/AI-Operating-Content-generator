import fs from "fs";
import path from "path";

function main() {
  const tempBase = path.join(process.env.LOCALAPPDATA || "", "Temp", "ShortFactory", "temp");
  const artifactDir = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f0dfb1f0-49f8-43aa-97b2-134517b4610d";
  
  if (!fs.existsSync(tempBase)) {
    console.error("Temp directory does not exist:", tempBase);
    return;
  }
  
  const jobs = fs.readdirSync(tempBase).filter(f => f.startsWith("job_"));
  if (jobs.length === 0) {
    console.error("No jobs found in:", tempBase);
    return;
  }
  
  // Get latest job
  jobs.sort((a, b) => {
    return fs.statSync(path.join(tempBase, b)).mtimeMs - fs.statSync(path.join(tempBase, a)).mtimeMs;
  });
  
  const latestJobDir = path.join(tempBase, jobs[0]);
  console.log(`Copying files from latest job directory: ${latestJobDir}`);
  
  const srcVideo = path.join(latestJobDir, "final_video.mp4");
  const destVideo = path.join(artifactDir, "final_video.mp4");
  
  if (fs.existsSync(srcVideo)) {
    fs.copyFileSync(srcVideo, destVideo);
    console.log(`Successfully copied final_video.mp4 to: ${destVideo}`);
  } else {
    console.error(`Source video not found at: ${srcVideo}`);
  }

  // Also copy a representative scene image overlay so they can preview the visual card
  const srcImage = path.join(latestJobDir, "scene_1.jpg");
  const destImage = path.join(artifactDir, "scene_1.jpg");
  
  if (fs.existsSync(srcImage)) {
    fs.copyFileSync(srcImage, destImage);
    console.log(`Successfully copied scene_1.jpg to: ${destImage}`);
  }
}

main();
