import { ImageProvider } from "./image-provider";

class ImageRegistryClass {
  private providers = new Map<string, ImageProvider>();

  register(provider: ImageProvider) {
    console.log(`[ImageRegistry] Registering provider plugin: ${provider.name} (${provider.id})`);
    this.providers.set(provider.id, provider);
  }

  get(id: string): ImageProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): ImageProvider[] {
    return Array.from(this.providers.values());
  }

  clear() {
    this.providers.clear();
  }
}

export const ImageRegistry = new ImageRegistryClass();
