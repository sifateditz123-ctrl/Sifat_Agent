import fs from 'node:fs';
import path from 'node:path';

export interface ProjectFileEntry {
  path: string;
  category: 'gradle' | 'manifest' | 'kotlin-core' | 'kotlin-ui' | 'resources' | 'tests' | 'backend' | 'docs';
  language: string;
  content: string;
  lineCount: number;
}

function classifyFile(relPath: string): {
  category: ProjectFileEntry['category'];
  language: string;
} {
  if (relPath.startsWith('server') || relPath === 'server.ts') {
    return { category: 'backend', language: 'typescript' };
  }
  if (relPath.endsWith('.md')) {
    return { category: 'docs', language: 'markdown' };
  }
  if (relPath.includes('/test/')) {
    return { category: 'tests', language: 'kotlin' };
  }
  if (relPath.endsWith('AndroidManifest.xml')) {
    return { category: 'manifest', language: 'xml' };
  }
  if (relPath.includes('/res/')) {
    return { category: 'resources', language: 'xml' };
  }
  if (relPath.endsWith('.kts') || relPath.endsWith('.toml') || relPath.endsWith('.properties') || relPath.endsWith('.pro')) {
    return { category: 'gradle', language: 'kotlin' };
  }
  if (relPath.includes('/ui/')) {
    return { category: 'kotlin-ui', language: 'kotlin' };
  }
  return { category: 'kotlin-core', language: 'kotlin' };
}

function walkDirectory(dir: string, rootDir: string, out: string[]) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(full, rootDir, out);
    } else if (entry.isFile()) {
      out.push(path.relative(rootDir, full).replace(/\\/g, '/'));
    }
  }
}

export function loadProjectBundle(workspaceRoot: string): ProjectFileEntry[] {
  const relativePaths: string[] = [];
  walkDirectory(path.join(workspaceRoot, 'android'), workspaceRoot, relativePaths);
  walkDirectory(path.join(workspaceRoot, 'docs'), workspaceRoot, relativePaths);

  for (const extra of [
    'README.md',
    'server.ts',
    'server/geminiPlanner.ts',
    'server/rateLimiter.ts',
    'src/shared/actionValidator.ts',
  ]) {
    if (fs.existsSync(path.join(workspaceRoot, extra))) {
      relativePaths.push(extra);
    }
  }

  const unique = Array.from(new Set(relativePaths)).sort();
  return unique.map((rel) => {
    const content = fs.readFileSync(path.join(workspaceRoot, rel), 'utf8');
    const meta = classifyFile(rel);
    return {
      path: rel,
      category: meta.category,
      language: meta.language,
      content,
      lineCount: content.split('\n').length,
    };
  });
}
