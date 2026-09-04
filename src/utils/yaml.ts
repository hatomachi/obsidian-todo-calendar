import { parse, stringify } from 'yaml';

/**
 * Universal YAML parser that works in both Obsidian and browser/Node environments.
 */
export function parseYamlContent(content: string): Record<string, any> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (match && match[1]) {
    try {
      const parsed = parse(match[1]);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
      console.error('Failed to parse YAML frontmatter:', e);
    }
  }
  return {};
}

/**
 * Universal YAML frontmatter encoder.
 */
export function stringifyFrontmatter(data: Record<string, any>, bodyContent = ''): string {
  try {
    const yamlStr = stringify(data).trim();
    return `---\n${yamlStr}\n---\n${bodyContent}`;
  } catch (e) {
    console.error('Failed to stringify YAML frontmatter:', e);
    return `---\n---\n${bodyContent}`;
  }
}

/**
 * Extract markdown body (excluding frontmatter).
 */
export function extractBodyContent(content: string): string {
  const bodyMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---([\s\S]*)$/);
  return bodyMatch ? bodyMatch[1] : content;
}

/**
 * Normalize tags input (array or string) into a clean string array.
 * Strips leading '#', splits by commas or spaces if string, trims and deduplicates.
 */
export function normalizeTags(raw: any): string[] {
  if (!raw) return [];
  const tagList: string[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const clean = item.trim().replace(/^#+/, '');
        if (clean) tagList.push(clean);
      }
    }
  } else if (typeof raw === 'string') {
    // Split by comma or whitespace
    const parts = raw.split(/[\s,]+/);
    for (const part of parts) {
      const clean = part.trim().replace(/^#+/, '');
      if (clean) tagList.push(clean);
    }
  }

  return Array.from(new Set(tagList));
}

