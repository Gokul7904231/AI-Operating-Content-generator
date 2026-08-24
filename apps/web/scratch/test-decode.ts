import { FFmpegService } from "../lib/core/FFmpegService";

function generateSilentWav(durationSeconds: number, sampleRate = 44100): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = Math.ceil(durationSeconds * sampleRate) * blockAlign;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // Write WAV header
  buffer.write("RIFF", 0, 4, "ascii");
  buffer.writeUInt32LE(headerSize + dataSize - 8, 4); // File size - 8
  buffer.write("WAVE", 8, 4, "ascii");
  buffer.write("fmt ", 12, 4, "ascii");
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat: 1 for PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, 4, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

async function main() {
  const buffer = generateSilentWav(5);
  console.log("Input buffer size:", buffer.length);
  
  const args = [
    "-i", "pipe:0",
    "-f", "wav",
    "-ar", "44100",
    "-ac", "1",
    "-acodec", "pcm_s16le",
    "pipe:1"
  ];

  try {
    const result = await FFmpegService.runFFmpeg(args, {
      inputBuffer: buffer,
      timeoutMs: 30000
    });
    console.log("Output buffer size:", result.stdout.length);
    console.log("Stderr:", result.stderr);
  } catch (err: any) {
    console.error("FFmpegService.runFFmpeg failed:", err.message);
    console.error("Stderr:", err.stderr);
    console.error("Classification:", err.classification);
  }
}

main();
