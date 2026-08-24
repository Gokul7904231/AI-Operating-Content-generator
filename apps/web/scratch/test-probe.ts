import { MediaInspector } from "../lib/core/MediaInspector";
import { AudioPostProcessor } from "../lib/voice/audio-processor";

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
  console.log("Original buffer size:", buffer.length);
  
  // Normalize
  const processed = AudioPostProcessor.processWav(buffer, {
    silenceThreshold: 0.012,
    fadeMs: 25
  });
  console.log("Processed buffer size:", processed.length);

  const meta = await MediaInspector.inspectAudio(processed);
  console.log("Metadata returned for processed WAV:", meta);
}

main();
