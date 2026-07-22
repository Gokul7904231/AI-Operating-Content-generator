const fs = require('fs');
const path = require('path');

function createSilentWav(seconds = 1, sampleRate = 44100) {
  const numChannels = 1; // Mono
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = seconds * byteRate;
  const chunkSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeInt32LE(16, 16); // Subchunk1Size
  buffer.writeInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeInt16LE(numChannels, 22);
  buffer.writeInt32LE(sampleRate, 24);
  buffer.writeInt32LE(byteRate, 28);
  buffer.writeInt16LE(blockAlign, 32);
  buffer.writeInt16LE(bytesPerSample * 8, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeInt32LE(dataSize, 40);

  // The rest of the buffer is filled with zeroes (silence)

  return buffer;
}

const wavBuf = createSilentWav(5, 44100);
const p = path.join(process.cwd(), 'data', 'voice-cache', '256c2c58c9757215b0c18622dd707579f649a93d1367fed6456e6fb5ba7aec03.wav');
fs.writeFileSync(p, wavBuf);
console.log("Mock WAV file created successfully at:", p);
