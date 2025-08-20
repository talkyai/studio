import React, { useMemo, useRef, useState } from 'react';
import { Box, Button, Divider, IconButton, MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { ContentCopy, Delete, ExpandLess, ExpandMore, PlayArrow, UploadFile } from '@mui/icons-material';
import { useChatStore } from '../stores/chatStore';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

export type BlockType = 'role' | 'context' | 'instruction' | 'examples' | 'input' | 'constraints' | 'output_format';

type BlockBase = { id: string; type: BlockType; title: string; collapsed?: boolean };

type RoleBlock = BlockBase & { type: 'role'; data: { text: string; preset?: string } };

type ContextBlock = BlockBase & { type: 'context'; data: { text: string } };

type InstructionBlock = BlockBase & { type: 'instruction'; data: { text: string } };

type ExamplesBlock = BlockBase & { type: 'examples'; data: { pairs: { input: string; output: string }[] } };

type InputVar = { name: string; value: string };

type InputBlock = BlockBase & { type: 'input'; data: { vars: InputVar[] } };

type ConstraintsBlock = BlockBase & { type: 'constraints'; data: { text: string } };

type OutputFormatBlock = BlockBase & { type: 'output_format'; data: { text: string } };

export type BuilderBlock = RoleBlock | ContextBlock | InstructionBlock | ExamplesBlock | InputBlock | ConstraintsBlock | OutputFormatBlock;

function newId() { return Math.random().toString(36).slice(2, 10); }


function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function replaceVars(text: string, vars: InputVar[]) {
  return vars.reduce((acc, v) => (v.name ? acc.split(`{{${v.name}}}`).join(v.value) : acc), text);
}

function composePrompt(blocks: BuilderBlock[], t: TFunction): { text: string; tokenCount: number } {
  const L = {
    role: t('builder.compose.role'),
    context: t('builder.compose.context'),
    instruction: t('builder.compose.instruction'),
    example: t('builder.compose.example'),
    input: t('builder.compose.input'),
    output: t('builder.compose.output'),
    constraints: t('builder.compose.constraints'),
    output_format: t('builder.compose.output_format'),
  };
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === 'role') {
      if (b.data.text.trim()) parts.push(`${L.role}: ${b.data.text.trim()}`);
    } else if (b.type === 'context') {
      if (b.data.text.trim()) parts.push(`${L.context}:\n${b.data.text.trim()}`);
    } else if (b.type === 'instruction') {
      if (b.data.text.trim()) parts.push(`${L.instruction}:\n${b.data.text.trim()}`);
    } else if (b.type === 'examples') {
      for (const [i, p] of b.data.pairs.entries()) {
        if (p.input.trim() || p.output.trim()) {
          parts.push(`${L.example} ${i + 1}:\n${L.input}: ${p.input.trim()}\n${L.output}: ${p.output.trim()}`);
        }
      }
    } else if (b.type === 'constraints') {
      if (b.data.text.trim()) parts.push(`${L.constraints}:\n${b.data.text.trim()}`);
    } else if (b.type === 'output_format') {
      if (b.data.text.trim()) parts.push(`${L.output_format}:\n${b.data.text.trim()}`);
    }
  }
  const text = parts.join('\n\n');
  return { text, tokenCount: estimateTokens(text) };
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Paper variant="outlined" sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
    {children}
  </Paper>
);

export function PromptBuilder({ setActiveTab }: { setActiveTab: (t: 'chat' | 'builder' | 'settings') => void }) {
  const { t } = useTranslation();
  const { sendMessage, mode: chatMode, isServerReady } = useChatStore();
  const [blocks, setBlocks] = useState<BuilderBlock[]>([]);

  const inputVars = useMemo(() => {
    const inputBlock = blocks.find(b => b.type === 'input') as InputBlock | undefined;
    return inputBlock?.data.vars ?? [];
  }, [blocks]);

  const library = useMemo(() => (
    [
      { type: 'role', title: t('builder.library.role.title'), hint: t('builder.library.role.hint') },
      { type: 'context', title: t('builder.library.context.title'), hint: t('builder.library.context.hint') },
      { type: 'instruction', title: t('builder.library.instruction.title'), hint: t('builder.library.instruction.hint') },
      { type: 'examples', title: t('builder.library.examples.title'), hint: t('builder.library.examples.hint') },
      { type: 'input', title: t('builder.library.input.title'), hint: t('builder.library.input.hint') },
      { type: 'constraints', title: t('builder.library.constraints.title'), hint: t('builder.library.constraints.hint') },
      { type: 'output_format', title: t('builder.library.output_format.title'), hint: t('builder.library.output_format.hint') },
    ] as { type: BlockType; title: string; hint: string }[]
  ), [t]);

  const onAddBlock = (type: BlockType) => {
    const common = { id: newId(), type, collapsed: false } as any;
    let b: BuilderBlock;
    switch (type) {
      case 'role': b = { ...common, title: t('builder.blockTitles.role'), data: { text: '', preset: '' } }; break;
      case 'context': b = { ...common, title: t('builder.blockTitles.context'), data: { text: '' } }; break;
      case 'instruction': b = { ...common, title: t('builder.blockTitles.instruction'), data: { text: '' } }; break;
      case 'examples': b = { ...common, title: t('builder.blockTitles.examples'), data: { pairs: [{ input: '', output: '' }] } }; break;
      case 'input': b = { ...common, title: t('builder.blockTitles.input'), data: { vars: [{ name: 'input', value: '' }] } }; break;
      case 'constraints': b = { ...common, title: t('builder.blockTitles.constraints'), data: { text: '' } }; break;
      case 'output_format': b = { ...common, title: t('builder.blockTitles.output_format'), data: { text: '' } }; break;
    }
    setBlocks(prev => [...prev, b!]);
  };

  // Drag and drop
  const dragTypeRef = useRef<'new' | 'move' | null>(null);
  const dragPayloadRef = useRef<any>(null);

  const handleLibDragStart = (t: BlockType) => (e: React.DragEvent) => {
    dragTypeRef.current = 'new';
    dragPayloadRef.current = t;
    e.dataTransfer.setData('text/plain', t);
  };

  const handleBlockDragStart = (index: number) => (e: React.DragEvent) => {
    dragTypeRef.current = 'move';
    dragPayloadRef.current = index;
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleCanvasDrop = (overIndex?: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const kind = dragTypeRef.current;
    const payload = dragPayloadRef.current;
    if (!kind) return;
    if (kind === 'new') {
      // insert new block at position
      const tBlock: BlockType = payload;
      const idx = overIndex ?? blocks.length;
      const temp: BuilderBlock[] = [...blocks];
      const common = { id: newId(), type: tBlock as BlockType, collapsed: false } as any;
      let b: BuilderBlock;
      switch (tBlock) {
        case 'role': b = { ...common, title: t('builder.blockTitles.role'), data: { text: '', preset: '' } }; break;
        case 'context': b = { ...common, title: t('builder.blockTitles.context'), data: { text: '' } }; break;
        case 'instruction': b = { ...common, title: t('builder.blockTitles.instruction'), data: { text: '' } }; break;
        case 'examples': b = { ...common, title: t('builder.blockTitles.examples'), data: { pairs: [{ input: '', output: '' }] } }; break;
        case 'input': b = { ...common, title: t('builder.blockTitles.input'), data: { vars: [{ name: 'input', value: '' }] } }; break;
        case 'constraints': b = { ...common, title: t('builder.blockTitles.constraints'), data: { text: '' } }; break;
        case 'output_format': b = { ...common, title: t('builder.blockTitles.output_format'), data: { text: '' } }; break;
      }
      temp.splice(idx, 0, b!);
      setBlocks(temp);
    } else if (kind === 'move') {
      const from = Number(payload);
      const to = overIndex ?? blocks.length - 1;
      if (from === to) return;
      const temp = [...blocks];
      const [moved] = temp.splice(from, 1);
      temp.splice(to, 0, moved);
      setBlocks(temp);
    }
    dragTypeRef.current = null;
    dragPayloadRef.current = null;
  };

  const handleCanvasDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const updateBlock = (id: string, updater: (b: BuilderBlock) => BuilderBlock) => {
    setBlocks(prev => prev.map(b => b.id === id ? updater({ ...b }) : b));
  };
  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));
  const duplicateBlock = (idx: number) => setBlocks(prev => {
    const copy = JSON.parse(JSON.stringify(prev[idx])) as BuilderBlock;
    (copy as any).id = newId();
    return [...prev.slice(0, idx + 1), copy as BuilderBlock, ...prev.slice(idx + 1)];
  });

  const composed = useMemo(() => composePrompt(blocks, t), [blocks, t]);
  const previewText = useMemo(() => replaceVars(composed.text, inputVars), [composed.text, inputVars]);
  const previewTokens = useMemo(() => estimateTokens(previewText), [previewText]);

  const handleExecute = async () => {
    const mode = useChatStore.getState().mode;
    const ready = useChatStore.getState().isServerReady;
    if ((mode === 'local' || mode === 'ollama') && !ready) {
      return;
    }
    try {
      await sendMessage(previewText);
      setActiveTab('chat');
    } catch (e) {
      console.warn('execute failed', e);
    }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '260px 1fr 360px', gap: 2, height: '100%', minHeight: 0, p: 2 }}>
      {/* Left Library */}
      <Panel title={t('builder.panel.library')}>
        <Stack spacing={1}>
          {library.map(item => (
            <Paper key={item.type} variant="outlined" sx={{ p: 1, cursor: 'grab' }} draggable
                   onDragStart={handleLibDragStart(item.type)} onDoubleClick={() => onAddBlock(item.type)}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">{item.hint}</Typography>
            </Paper>
          ))}
        </Stack>
      </Panel>

      {/* Center Canvas */}
      <Panel title={t('builder.panel.canvas')} >
        <Stack spacing={1} onDrop={handleCanvasDrop()} onDragOver={handleCanvasDragOver}
               sx={{ minHeight: 0, overflow: 'auto', p: 0.5, border: '1px dashed', borderColor: 'divider' }}>
          {blocks.map((b, idx) => (
            <Paper key={b.id} variant="outlined" sx={{ p: 1 }} draggable onDragStart={handleBlockDragStart(idx)}
                   onDrop={handleCanvasDrop(idx)} onDragOver={handleCanvasDragOver}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{b.title}</Typography>
                <Box>
                  <Tooltip title={t('builder.actions.duplicate')}><IconButton size="small" onClick={() => duplicateBlock(idx)}><ContentCopy fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={b.collapsed ? t('common.expand') : t('common.collapse')}>
                    <IconButton size="small" onClick={() => updateBlock(b.id, x => ({ ...x, collapsed: !x.collapsed }))}>
                      {b.collapsed ? <ExpandMore fontSize="small"/> : <ExpandLess fontSize="small"/>}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('builder.actions.delete')}><IconButton size="small" color="error" onClick={() => removeBlock(b.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                </Box>
              </Box>
              {!b.collapsed && (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {b.type === 'role' && (
                    <>
                      <Typography variant="caption">{t('builder.role.preset')}</Typography>
                      <Select size="small" value={(b as RoleBlock).data.preset ?? ''}
                              onChange={(e) => updateBlock(b.id, x => ({ ...x as RoleBlock, data: { ...(x as RoleBlock).data, preset: e.target.value, text: ((x as RoleBlock).data.text || '') } }))}>
                        <MenuItem value="">{t('builder.role.presets.none')}</MenuItem>
                        <MenuItem value="copywriter">{t('builder.role.presets.copywriter')}</MenuItem>
                        <MenuItem value="programmer">{t('builder.role.presets.programmer')}</MenuItem>
                        <MenuItem value="critic">{t('builder.role.presets.critic')}</MenuItem>
                      </Select>
                      <TextField size="small" multiline minRows={2} placeholder={t('builder.role.placeholder')!}
                                 value={(b as RoleBlock).data.text}
                                 onChange={(e) => updateBlock(b.id, x => ({ ...x as RoleBlock, data: { ...(x as RoleBlock).data, text: e.target.value } }))}/>
                    </>
                  )}

                  {b.type === 'context' && (
                    <>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" variant="outlined" startIcon={<UploadFile />} component="label">
                          {t('builder.context.uploadButton')}
                          <input type="file" hidden accept=".txt,.pdf,.doc,.docx"
                                 onChange={async (e) => {
                                   const f = e.target.files?.[0];
                                   if (!f) return;
                                   if (f.name.toLowerCase().endsWith('.txt')) {
                                     const text = await f.text();
                                     updateBlock(b.id, x => ({ ...x as ContextBlock, data: { text: ((x as ContextBlock).data.text || '') + (text ? ( ((x as ContextBlock).data.text ? '\n' : '') + text) : '') } }));
                                   } else {
                                     alert(t('builder.context.uploadUnsupported') as string);
                                   }
                                   e.currentTarget.value = '';
                                 }} />
                        </Button>
                        <Typography variant="caption" color="text.secondary">{t('builder.context.uploadNote')}</Typography>
                      </Stack>
                      <TextField size="small" multiline minRows={4} placeholder={t('builder.context.placeholder')!}
                                 value={(b as ContextBlock).data.text}
                                 onChange={(e) => updateBlock(b.id, x => ({ ...x as ContextBlock, data: { text: e.target.value } }))}/>
                    </>
                  )}

                  {b.type === 'instruction' && (
                    <TextField size="small" multiline minRows={3} placeholder={t('builder.instruction.placeholder')!}
                               value={(b as InstructionBlock).data.text}
                               onChange={(e) => updateBlock(b.id, x => ({ ...x as InstructionBlock, data: { text: e.target.value } }))}/>
                  )}

                  {b.type === 'examples' && (
                    <Stack spacing={1}>
                      {(b as ExamplesBlock).data.pairs.map((p, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1 }}>
                          <Typography variant="caption">{t('builder.examples.exampleLabel', { n: i + 1 })}</Typography>
                          <TextField size="small" multiline minRows={2} placeholder={t('builder.examples.inputPlaceholder')!}
                                     value={p.input}
                                     onChange={(e) => updateBlock(b.id, x => {
                                       const y = x as ExamplesBlock; const pairs = [...y.data.pairs];
                                       pairs[i] = { ...pairs[i], input: e.target.value }; return { ...y, data: { pairs } };
                                     })}/>
                          <TextField size="small" multiline minRows={2} placeholder={t('builder.examples.outputPlaceholder')!} sx={{ mt: 1 }}
                                     value={p.output}
                                     onChange={(e) => updateBlock(b.id, x => {
                                       const y = x as ExamplesBlock; const pairs = [...y.data.pairs];
                                       pairs[i] = { ...pairs[i], output: e.target.value }; return { ...y, data: { pairs } };
                                     })}/>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <Button size="small" color="error" onClick={() => updateBlock(b.id, x => {
                              const y = x as ExamplesBlock; const pairs = y.data.pairs.filter((_, j) => j !== i);
                              return { ...y, data: { pairs: pairs.length ? pairs : [{ input: '', output: '' }] } } as ExamplesBlock;
                            })}>{t('builder.examples.deleteExample')}</Button>
                          </Box>
                        </Paper>
                      ))}
                      <Button size="small" onClick={() => updateBlock(b.id, x => {
                        const y = x as ExamplesBlock; return { ...y, data: { pairs: [...y.data.pairs, { input: '', output: '' }] } };
                      })}>{t('builder.examples.addExample')}</Button>
                    </Stack>
                  )}

                  {b.type === 'input' && (
                    <Stack spacing={1}>
                      {(b as InputBlock).data.vars.map((v, i) => (
                        <Stack key={i} direction="row" spacing={1} alignItems="center">
                          <TextField size="small" label={t('builder.input.name')} value={v.name}
                                     onChange={(e) => updateBlock(b.id, x => {
                                       const y = x as InputBlock; const vars = [...y.data.vars]; vars[i] = { ...vars[i], name: e.target.value }; return { ...y, data: { vars } };
                                     })}/>
                          <TextField size="small" label={t('builder.input.value')} fullWidth value={v.value}
                                     onChange={(e) => updateBlock(b.id, x => {
                                       const y = x as InputBlock; const vars = [...y.data.vars]; vars[i] = { ...vars[i], value: e.target.value }; return { ...y, data: { vars } };
                                     })}/>
                          <Typography variant="caption" color="text.secondary">{`{{${v.name || 'name'}}}`}</Typography>
                          <IconButton size="small" color="error" onClick={() => updateBlock(b.id, x => {
                            const y = x as InputBlock; const vars = y.data.vars.filter((_, j) => j !== i); return { ...y, data: { vars: vars.length ? vars : [{ name: 'input', value: '' }] } };
                          })}><Delete fontSize="small"/></IconButton>
                        </Stack>
                      ))}
                      <Button size="small" onClick={() => updateBlock(b.id, x => {
                        const y = x as InputBlock; return { ...y, data: { vars: [...y.data.vars, { name: '', value: '' }] } };
                      })}>{t('builder.input.addVar')}</Button>
                    </Stack>
                  )}

                  {b.type === 'constraints' && (
                    <TextField size="small" multiline minRows={3} placeholder={t('builder.constraints.placeholder')!}
                               value={(b as ConstraintsBlock).data.text}
                               onChange={(e) => updateBlock(b.id, x => ({ ...x as ConstraintsBlock, data: { text: e.target.value } }))}/>
                  )}

                  {b.type === 'output_format' && (
                    <TextField size="small" multiline minRows={2} placeholder={t('builder.output.placeholder')!}
                               value={(b as OutputFormatBlock).data.text}
                               onChange={(e) => updateBlock(b.id, x => ({ ...x as OutputFormatBlock, data: { text: e.target.value } }))}/>
                  )}
                </Box>
              )}
            </Paper>
          ))}
          {blocks.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>{t('builder.emptyCanvas')}</Typography>
          )}
        </Stack>
      </Panel>

      {/* Right Preview */}
      <Panel title={t('builder.panel.preview')}>
        <Typography variant="caption" color="text.secondary">{t('builder.preview.tokens')}: ~{previewTokens}</Typography>
        <Paper variant="outlined" sx={{ p: 1, mt: 1, minHeight: 240, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
          {previewText}
        </Paper>
        <Divider sx={{ my: 1 }} />
        <Tooltip title={(chatMode === 'local' || chatMode === 'ollama') && !isServerReady ? t('builder.preview.serverNotReady') : t('builder.preview.sendPrompt')}>
          <span>
            <Button variant="contained" startIcon={<PlayArrow />} disabled={(chatMode === 'local' || chatMode === 'ollama') && !isServerReady}
                    onClick={handleExecute}>{t('builder.preview.execute')}</Button>
          </span>
        </Tooltip>
      </Panel>
    </Box>
  );
}
