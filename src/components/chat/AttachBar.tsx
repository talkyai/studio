import React, { useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Divider, Menu, MenuItem, Stack, Tooltip } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import FolderIcon from '@mui/icons-material/Folder';
import BuildIcon from '@mui/icons-material/Build';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation } from 'react-i18next';

interface AttachBarProps {
  onInsert: (text: string) => void;
}

const TEXT_EXTS = new Set([
  'txt','md','markdown','json','jsonc','yml','yaml','toml','ini','cfg','conf',
  'js','ts','tsx','jsx','mjs','cjs','c','cc','cpp','h','hpp','hh','cs','java','kt','kts','go','rs','py','rb','php','swift',
  'sql','html','xml','svg','css','scss','less','sh','bash','bat','ps1','gradle','properties','gitignore','gitattributes','env','dockerfile','makefile','cmake'
]);

const SKIP_DIRS = ['node_modules', 'dist', 'build', 'out', 'target', '.git', '.next', '.turbo', 'vendor', '.idea', '.vscode'];

const FILE_SIZE_LIMIT = 256 * 1024; // 256 KB per file
const TOTAL_SIZE_LIMIT = 1024 * 1024; // 1 MB total

export const AttachBar: React.FC<AttachBarProps> = ({ onInsert }) => {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dirInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const acceptAttr = useMemo(() => [
    '.txt','.md','.markdown','.json','.jsonc','.yml','.yaml','.toml','.ini','.cfg','.conf',
    '.js','.ts','.tsx','.jsx','.mjs','.cjs','.c','.cc','.cpp','.h','.hpp','.hh','.cs','.java','.kt','.kts','.go','.rs','.py','.rb','.php','.swift',
    '.sql','.html','.xml','.svg','.css','.scss','.less','.sh','.bash','.bat','.ps1','.gradle','.properties'
  ].join(','), []);

  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const closeMenu = () => setAnchor(null);

  function extOf(name: string) {
    const m = name.toLowerCase().match(/\.([a-z0-9_\-]+)$/);
    return m ? m[1] : '';
  }

  function shouldSkipPath(path: string) {
    return SKIP_DIRS.some((dir) => path.split(/[/\\]/).includes(dir));
  }

  async function readFileAsText(file: File): Promise<string | null> {
    if (file.size > FILE_SIZE_LIMIT) return null;
    const ext = extOf(file.name);
    if (!TEXT_EXTS.has(ext)) return null;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read failed'));
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.readAsText(file);
    });
  }

  function buildFilesContext(items: { path: string; content: string }[]) {
    const parts: string[] = [];
    parts.push('### Context from files');
    items.forEach(({ path, content }) => {
      const ext = extOf(path);
      parts.push(`\n[${path}]`);
      parts.push('```' + (ext || 'text'));
      // Trim very long content just in case
      const trimmed = content.length > FILE_SIZE_LIMIT ? content.slice(0, FILE_SIZE_LIMIT) + '\n... [trimmed]' : content;
      parts.push(trimmed);
      parts.push('```');
    });
    return parts.join('\n');
  }

  function buildTreeFromRelativePaths(paths: string[]) {
    // Normalize separators and sort
    const norm = paths.map((p) => p.replace(/\\/g, '/')).filter((p) => !shouldSkipPath(p)).sort((a, b) => a.localeCompare(b));
    const lines: string[] = ['### Project tree', ''];
    for (const p of norm) {
      const segs = p.split('/');
      // Detect depth (exclude file itself for indent calculation? we indent by depth-1)
      const depth = Math.max(0, segs.length - 1);
      const name = segs[segs.length - 1];
      lines.push(`${'  '.repeat(depth)}- ${name}`);
    }
    return lines.join('\n');
  }

  const handlePickFiles = () => {
    closeMenu();
    fileInputRef.current?.click();
  };

  const handlePickDirForTree = () => {
    closeMenu();
    dirInputRef.current?.click();
  };

  const onFilesChosen: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      setBusy(true);
      const files = Array.from(e.target.files || []);
      let total = 0;
      const picked: { path: string; content: string }[] = [];
      for (const f of files) {
        const content = await readFileAsText(f);
        if (content == null) continue;
        if (total + content.length > TOTAL_SIZE_LIMIT) break;
        const rel = (f as any).webkitRelativePath || f.name;
        picked.push({ path: rel, content });
        total += content.length;
      }
      if (picked.length) {
        onInsert(buildFilesContext(picked));
      }
    } finally {
      setBusy(false);
      // reset input value to allow same selection again
      if (e.target) e.target.value = '';
    }
  };

  const onDirChosen: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      setBusy(true);
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const relPaths = files.map((f) => (f as any).webkitRelativePath || f.name);
      const tree = buildTreeFromRelativePaths(relPaths);
      onInsert(tree);
    } finally {
      setBusy(false);
      if (e.target) e.target.value = '';
    }
  };

  const insertDevPrompt = () => {
    closeMenu();
    const prompt = [
      'You are a senior software engineer. Analyze the provided code context and answer precisely.',
      'Rules:',
      '- If context includes a project tree, use it to understand structure.',
      '- When referencing code, quote specific filenames and lines if possible.',
      '- Prefer concise, actionable steps and minimal changes.',
    ].join('\n');
    onInsert(prompt);
  };

  return (
      <Box sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Tooltip title={t('ctx.attach') ?? 'Контекст'}>
          <span>
            <Button size="small" variant="outlined" startIcon={<AttachFileIcon />} onClick={openMenu} disabled={busy}>
              {t('ctx.title') ?? 'Контекст'}
            </Button>
          </span>
          </Tooltip>
          {busy && <Chip size="small" label={t('common.loading') ?? 'Загрузка…'} />}
        </Stack>

        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
          <MenuItem onClick={handlePickFiles}>
            <InsertDriveFileIcon fontSize="small" style={{ marginRight: 8 }} /> {t('ctx.fromFiles') ?? 'Вставить файлы'}
          </MenuItem>
          <MenuItem onClick={handlePickDirForTree}>
            <FolderIcon fontSize="small" style={{ marginRight: 8 }} /> {t('ctx.fromFolderTree') ?? 'Дерево папки'}
          </MenuItem>
          <Divider />
          <MenuItem onClick={insertDevPrompt}>
            <BuildIcon fontSize="small" style={{ marginRight: 8 }} /> {t('dev.insertPrompt') ?? 'Подсказка разработчику'}
          </MenuItem>
        </Menu>

        {/* hidden inputs */}
        <input
            type="file"
            ref={fileInputRef}
            multiple
            accept={acceptAttr}
            style={{ display: 'none' }}
            onChange={onFilesChosen}
        />
        <input
            type="file"
            ref={dirInputRef}
            multiple
            // @ts-ignore Edge/WebView supports webkitdirectory attribute
            webkitdirectory="true"
            style={{ display: 'none' }}
            onChange={onDirChosen}
        />
      </Box>
  );
};