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
