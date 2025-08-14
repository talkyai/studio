import { Box, Collapse, IconButton, Paper, Stack, Typography, Tooltip, Avatar } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import React, { useEffect, useRef, useState } from "react";
import { Message } from "../../stores/types";
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';
import { PluginMessageActions } from '../plugins/PluginMessageActions';

interface MessagesListProps {
  messages: Message[];
}

interface MessageBubbleProps { sender: 'user' | 'ai'; }
const MessageBubble = styled(Paper, { shouldForwardProp: (prop) => prop !== 'sender' })<MessageBubbleProps>(({ theme, sender }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '18px',
  maxWidth: 'min(80%, 800px)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  backgroundColor: sender === 'user'
      ? theme.palette.mode === 'dark'
          ? theme.palette.primary.dark
          : 'rgba(51, 187, 119, 0.2)'
      : theme.palette.mode === 'dark'
          ? theme.palette.grey[800]
          : theme.palette.grey[50],
  position: 'relative',
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 0,
    height: 0,
    [sender === 'user' ? 'right' : 'left']: '-8px',
    top: '12px',
    border: '8px solid transparent',
    borderTop: '0',
    [sender === 'user' ? 'borderLeft' : 'borderRight']: `8px solid ${
        sender === 'user'
            ? theme.palette.mode === 'dark'
                ? theme.palette.primary.dark
                : 'rgba(51, 187, 119, 0.2)'
            : theme.palette.mode === 'dark'
                ? theme.palette.grey[800]
                : theme.palette.grey[50]
    }`
  }
}));

const CodeBlock = styled(Box)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflowX: 'auto',
  backgroundColor: theme.palette.mode === 'dark'
      ? theme.palette.grey[900]
      : theme.palette.grey[100],
  '& pre': {
    margin: 0,
    padding: theme.spacing(1),
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '0.875rem',
    whiteSpace: 'pre-wrap'
  }
}));

const InlineCode = styled(Box)(({ theme }) => ({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  backgroundColor: theme.palette.mode === 'dark'
      ? theme.palette.grey[800]
      : theme.palette.grey[100],
  border: '1px solid',
  borderColor: theme.palette.divider,
  padding: theme.spacing(0.1, 0.5),
  borderRadius: 4,
  display: 'inline-block',
  lineHeight: 1.4
}));

function metaEntries(meta: any) {
  if (!meta) return [];

  const entries = [];
  if (meta.model) entries.push({ label: 'model', value: meta.model });

  if (meta.usage) {
    const { prompt_tokens, completion_tokens, total_tokens } = meta.usage;
    if (typeof prompt_tokens === 'number') entries.push({
      label: 'prompt_tokens',
      value: prompt_tokens.toLocaleString()
    });
    if (typeof completion_tokens === 'number') entries.push({
      label: 'completion_tokens',
      value: completion_tokens.toLocaleString()
    });
    if (typeof total_tokens === 'number') entries.push({
      label: 'total_tokens',
      value: total_tokens.toLocaleString()
    });
  }

  if (meta.timings) {
    const { prompt_ms, predicted_ms, prompt_n, predicted_n } = meta.timings;
    if (typeof prompt_ms === 'number') entries.push({
      label: 'prompt_time',
      value: `${prompt_ms}ms`
    });
    if (typeof predicted_ms === 'number') entries.push({
      label: 'gen_time',
      value: `${predicted_ms}ms`
    });
    if (typeof prompt_n === 'number') entries.push({
      label: 'prompt_tokens',
      value: prompt_n
    });
    if (typeof predicted_n === 'number') entries.push({
      label: 'gen_tokens',
      value: predicted_n
    });
  }

  return entries;
}

function renderEmphasis(text: string) {
  // Process bold (**text** or __text__) then italic (*text* or _text_)
  const applyBold = (input: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    const re = /\*\*([^*]+)\*\*|__([^_]+)__/g;
    let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      if (m.index > last) out.push(input.slice(last, m.index));
      const content = m[1] ?? m[2] ?? '';
      out.push(<strong key={`b-${m.index}`}>{content}</strong>);
      last = m.index + m[0].length;
    }
    if (last < input.length) out.push(input.slice(last));
    return out;
  };

  const applyItalicToNode = (node: React.ReactNode, keyPrefix: string): React.ReactNode => {
    if (typeof node !== 'string') return node;
    const input = node as string;
    const out: React.ReactNode[] = [];
    const re = /(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_/g;
    let last = 0; let m: RegExpExecArray | null; let idx = 0;
    while ((m = re.exec(input)) !== null) {
      if (m.index > last) out.push(input.slice(last, m.index));
      const content = m[1] ?? m[2] ?? '';
      out.push(<em key={`${keyPrefix}-i-${idx++}`}>{content}</em>);
      last = m.index + m[0].length;
    }
    if (last < input.length) out.push(input.slice(last));
    return out.length === 1 ? out[0] : <>{out}</>;
  };

  const withBold = applyBold(text);
  const withItalic = withBold.map((n, i) => applyItalicToNode(n, `em${i}`));
  return <>{withItalic}</>;
}

function renderLinksAndEmphasis(text: string) {
  // Links: [text](http[s]://...)
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const out: React.ReactNode[] = [];
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(renderEmphasis(text.slice(last, m.index)));
    const label = m[1];
    const href = m[2];
    out.push(
      <a key={`lnk-${m.index}`} href={href} target="_blank" rel="noreferrer noopener">{label}</a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(renderEmphasis(text.slice(last)));
  return <>{out}</>;
}

function renderInlineWithCode(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [full, code] = match;

    if (match.index > last) {
      parts.push(
        <Box key={`text-${last}`} component="span" sx={{ whiteSpace: 'pre-wrap' }}>
          {renderLinksAndEmphasis(text.slice(last, match.index))}
        </Box>
      );
    }

    parts.push(
      <InlineCode key={`code-${match.index}`}>
        {code}
      </InlineCode>
    );

    last = match.index + full.length;
  }

  if (last < text.length) {
    parts.push(
      <Box key={`text-end-${last}`} component="span" sx={{ whiteSpace: 'pre-wrap' }}>
        {renderLinksAndEmphasis(text.slice(last))}
      </Box>
    );
  }

  return <>{parts}</>;
}

function renderMessageText(text: string) {
  // Block-level Markdown parsing: code fences, headings, lists, paragraphs
  const lines = text.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let inFence = false; let fenceMarker = ""; let fenceStart = 0; const fenceLines: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimStart();

    // Fence start/end
    if (!inFence && (trimmed.startsWith('```') || trimmed.startsWith('~~~'))) {
      inFence = true; fenceMarker = trimmed.slice(0, 3); fenceStart = i; i++; continue;
    }
    if (inFence) {
      if (trimmed.startsWith(fenceMarker)) {
        // close fence
        nodes.push(
          <CodeBlock key={`codeblock-${fenceStart}`}>
            <pre>{fenceLines.join('\n')}</pre>
          </CodeBlock>
        );
        fenceLines.length = 0; inFence = false; i++; continue;
      } else {
        fenceLines.push(line);
        i++; continue;
      }
    }

    // Skip extra blank lines (will create paragraph boundaries)
    if (trimmed === '') { i++; continue; }

    // Headings: # to ######
    const h = /^\s{0,3}(#{1,6})\s+(.+)$/.exec(line);
    if (h) {
      const level = Math.min(6, h[1].length);
      const content = h[2];
      nodes.push(
        <Typography key={`h-${i}`} variant={`h${Math.min(level, 6)}` as any} component={`h${Math.min(level, 6)}` as any} sx={{ mt: 1, mb: 0.5 }}>
          {renderInlineWithCode(content)}
        </Typography>
      );
      i++; continue;
    }

    // Unordered list block
    const ulMatch = /^\s*([*+-])\s+(.+)$/.exec(line);
    if (ulMatch) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length) {
        const m = /^\s*([*+-])\s+(.+)$/.exec(lines[j]);
        if (!m) break;
        items.push(m[2]);
        j++;
      }
      nodes.push(
        <Box key={`ul-${i}`} component="ul" sx={{ pl: 3, my: 0.5 }}>
          {items.map((it, idx) => (
            <Box key={idx} component="li" sx={{ '&::marker': { color: 'text.secondary' } }}>
              {renderInlineWithCode(it)}
            </Box>
          ))}
        </Box>
      );
      i = j; continue;
    }

    // Ordered list block
    const olMatch = /^\s*(\d+)[\.)]\s+(.+)$/.exec(line);
    if (olMatch) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length) {
        const m = /^\s*(\d+)[\.)]\s+(.+)$/.exec(lines[j]);
        if (!m) break;
        items.push(m[2]);
        j++;
      }
      nodes.push(
        <Box key={`ol-${i}`} component="ol" sx={{ pl: 3, my: 0.5 }}>
          {items.map((it, idx) => (
            <Box key={idx} component="li" sx={{ '&::marker': { color: 'text.secondary' } }}>
              {renderInlineWithCode(it)}
            </Box>
          ))}
        </Box>
      );
      i = j; continue;
    }

    // Paragraph: accumulate until blank line or block start
    const paraLines: string[] = [line];
    let j = i + 1;
    while (j < lines.length) {
      const peek = lines[j];
      const t = peek.trimStart();
      if (t === '' || /^\s{0,3}#{1,6}\s+/.test(peek) || /^\s*([*+-])\s+/.test(peek) || /^\s*(\d+)[\.)]\s+/.test(peek) || t.startsWith('```') || t.startsWith('~~~')) {
        break;
      }
      paraLines.push(peek);
      j++;
    }
    nodes.push(
      <Box key={`p-${i}`} component="p" sx={{ mb: 1.0, whiteSpace: 'pre-wrap' }}>
        {renderInlineWithCode(paraLines.join(' '))}
      </Box>
    );
    i = j; continue;
  }

  // If file ends while in fence (unterminated), still render it
  if (inFence && fenceLines.length) {
    nodes.push(
      <CodeBlock key={`codeblock-${fenceStart}`}>
        <pre>{fenceLines.join('\n')}</pre>
      </CodeBlock>
    );
  }

  return <Box sx={{ lineHeight: 1.6 }}>{nodes}</Box>;
}

export const MessagesList: React.FC<MessagesListProps> = ({ messages }) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        overflowY: 'auto',
        flexGrow: 1
      }}>
        {messages.length === 0 ? (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'text.secondary'
            }}>
              <Typography variant="body1">
                {t('chat.empty')}
              </Typography>
            </Box>
        ) : (
            messages.map((msg, i) => {
              const hasMeta = msg.sender === 'ai' && !!msg.meta;
              const isExpanded = !!expanded[i];
              const meta = msg.meta;
              const metaData = metaEntries(meta);

              return (
                  <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: 1
                      }}
                  >
                    {msg.sender === 'ai' && (
                        <Tooltip title="AI Assistant">
                          <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText'
                              }}
                          >
                            AI
                          </Avatar>
                        </Tooltip>
                    )}

                    <MessageBubble sender={msg.sender}>
                      {renderMessageText(msg.text)}

                      {hasMeta && metaData.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Tooltip title={isExpanded ? t('common.hideDetails') : t('common.showDetails')}>
                              <IconButton
                                  size="small"
                                  onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                                  sx={{ float: 'right' }}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </Tooltip>

                            <Collapse in={isExpanded}>
                              <Box sx={{
                                mt: 1,
                                pt: 1,
                                borderTop: '1px dashed',
                                borderColor: 'divider'
                              }}>
                                <Stack spacing={0.5}>
                                  {metaData.map((entry, idx) => (
                                      <Box key={idx} sx={{ display: 'flex' }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                              minWidth: 120,
                                              color: 'text.secondary',
                                              fontWeight: 500
                                            }}
                                        >
                                          {t(`meta.${entry.label}`)}:
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                              fontFamily: 'monospace',
                                              color: 'text.primary'
                                            }}
                                        >
                                          {entry.value}
                                        </Typography>
                                      </Box>
                                  ))}
                                </Stack>
                              </Box>
                            </Collapse>
                          </Box>
                      )}

                      {/* Plugin actions under message content */}
                      <PluginMessageActions sender={msg.sender} index={i} message={msg as any} />
                    </MessageBubble>

                    {msg.sender === 'user' && (
                        <Tooltip title="You">
                          <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: 'secondary.main',
                                color: 'secondary.contrastText'
                              }}
                          >
                            U
                          </Avatar>
                        </Tooltip>
                    )}
                  </Box>
              );
            })
        )}
        <div ref={endRef} />
      </Box>
  );
};