import { AudioPostProcessor } from "../lib/voice/audio-processor";

function generateSilentWav(durationSeconds: number, sampleRate = 44100): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = Math.ceil(durationSeconds * sampleRate) * blockAlign;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  buffer.write("RIFF", 0, 4, "ascii");
  buffer.writeUInt32LE(headerSize + dataSize - 8, 4);
  buffer.write("WAVE", 8, 4, "ascii");
  buffer.write("fmt ", 12, 4, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, 4, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

async function main() {
  const duration = 16.65;
  const buffer = generateSilentWav(duration);
  console.log("Input size:", buffer.length);
  
  console.time("processWav");
  const processed = AudioPostProcessor.processWav(buffer, {
    silenceThreshold: 0.012,
    fadeMs: 25
  });
  console.timeEnd("processWav");
  console.log("Processed size:", processed.length);
}
main();
