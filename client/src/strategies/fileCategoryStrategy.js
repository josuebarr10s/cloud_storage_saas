/**
 * Patrón Strategy (Estrategia): Clasificación y tipado de archivos según su extensión.
 * Facilita extender soporte a nuevos tipos de archivos sin modificar código existente 
 * (Open/Closed Principle).
 */

class ImageCategoryStrategy {
  extensions = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp', 'ico'];

  matches(ext) {
    return this.extensions.includes(ext);
  }

  getMetadata(ext) {
    return { type: 'image', category: 'images', mimeCategory: 'image', ext };
  }
}

class VideoCategoryStrategy {
  extensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];

  matches(ext) {
    return this.extensions.includes(ext);
  }

  getMetadata(ext) {
    return { type: 'video', category: 'media', mimeCategory: 'video', ext };
  }
}

class AudioCategoryStrategy {
  extensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];

  matches(ext) {
    return this.extensions.includes(ext);
  }

  getMetadata(ext) {
    return { type: 'audio', category: 'media', mimeCategory: 'audio', ext };
  }
}

class ArchiveCategoryStrategy {
  extensions = ['zip', 'rar', '7z', 'tar', 'gz'];

  matches(ext) {
    return this.extensions.includes(ext);
  }

  getMetadata(ext) {
    return { type: 'zip', category: 'docs', mimeCategory: 'archive', ext };
  }
}

class PdfCategoryStrategy {
  extensions = ['pdf'];

  matches(ext) {
    return this.extensions.includes(ext);
  }

  getMetadata(ext) {
    return { type: 'pdf', category: 'docs', mimeCategory: 'pdf', ext };
  }
}

class CodeCategoryStrategy {
  extensions = [
    'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'txt', 'md', 'csv',
    'sql', 'py', 'java', 'c', 'cpp', 'xml', 'yaml', 'yml'
  ];

  matches(ext) {
    return this.extensions.includes(ext);
  }

  getMetadata(ext) {
    return { type: 'code', category: 'docs', mimeCategory: 'text', ext };
  }
}

class FallbackDocumentCategoryStrategy {
  matches() {
    return true;
  }

  getMetadata(ext) {
    return { type: 'doc', category: 'docs', mimeCategory: 'other', ext };
  }
}

const STRATEGIES = [
  new ImageCategoryStrategy(),
  new VideoCategoryStrategy(),
  new AudioCategoryStrategy(),
  new ArchiveCategoryStrategy(),
  new PdfCategoryStrategy(),
  new CodeCategoryStrategy(),
  new FallbackDocumentCategoryStrategy(),
];

/**
 * Detecta la categoría y metadatos de un archivo aplicando la estrategia correspondiente.
 * @param {string} filename 
 * @returns {{ type: string, category: string, mimeCategory: string, ext: string }}
 */
export function detectCategoryAndType(filename = '') {
  const ext = String(filename).split('.').pop()?.toLowerCase() || '';
  const strategy = STRATEGIES.find(s => s.matches(ext)) || STRATEGIES[STRATEGIES.length - 1];
  return strategy.getMetadata(ext);
}
