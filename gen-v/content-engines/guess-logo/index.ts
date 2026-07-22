import { EngineLoader } from '../_loader';

EngineLoader.register({
  id: 'guess-logo',
  name: 'Guess Logo Engine',
  version: '1.0',
  renderProfile: 'FAST_SHORTS',
  hookPrompt: 'prompts/hook.txt',
  scenePrompt: 'prompts/scene.txt',
  voicePrompt: 'prompts/voice.txt',
  thumbnailPrompt: 'prompts/thumbnail.txt',
  metadataPrompt: 'prompts/metadata.txt',
  criticRules: 'critic.json',
  rendererConfig: 'renderer.json',
});

