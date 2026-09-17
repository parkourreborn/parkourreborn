'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, Square } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import Blocks from '@/components/tools/rebornai-blocks';
import RichText from '@/components/tools/rebornai-text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';
import { discordAvatar } from '@/lib/discord';
import { chatTime, newEntry, streamRebornAi, toHistory } from '@/lib/pages/rebornai';
import type { ChatEntry } from '@/lib/pages/rebornai';
import { limits } from '@/lib/reborn-ai/limits';
import type { AssistantStatus } from '@/lib/reborn-ai/types';

type Who = {
  name: string;
  avatar: string;
  bot: boolean;
};

const statusLabels: Record<AssistantStatus, string> = {
  thinking: 'thinking',
  looking: 'checking',
  writing: 'typing',
};

function Row({ entry, who, status }: { entry: ChatEntry; who: Who; status: AssistantStatus | null }) {
  const waiting = status !== null && !entry.content;

  return (
    <article className={`ai-row${who.bot ? ' ai-row--bot' : ''}`}>
      <Avatar className="ai-avatar">
        {who.avatar ? <AvatarImage src={who.avatar} alt="" /> : null}
        <AvatarFallback>{who.name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="ai-row__main">
        <header className="ai-row__head">
          <strong>{who.name}</strong>
          {who.bot ? <span className="ai-tag">BOT</span> : null}
          <time>{chatTime(entry.at)}</time>
        </header>

        <div className="ai-row__body">
          {waiting ? (
            <span className="ai-waiting">
              <span className="ai-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {statusLabels[status]}
            </span>
          ) : <RichText value={entry.content} />}
          <Blocks blocks={entry.blocks} />
        </div>
      </div>
    </article>
  );
}

export default function RebornAi() {
  const { account, discord } = useAuth();
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [error, setError] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pinned = useRef(true);
  const busy = status !== null;

  const bot: Who = { name: 'Reborn AI', avatar: images.logo.ai, bot: true };
  const you: Who = {
    name: account?.displayName || discord?.globalName || discord?.username || 'You',
    avatar: discord ? discordAvatar(discord) : '',
    bot: false,
  };

  const scrollDown = useCallback(() => {
    const thread = threadRef.current;
    if (thread && pinned.current) thread.scrollTop = thread.scrollHeight;
  }, []);

  useEffect(() => {
    scrollDown();
  }, [entries, scrollDown, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 168)}px`;
  }, [input]);

  const send = async (text: string) => {
    const message = text.trim().slice(0, limits.maxMessageChars);
    if (!message || busy) return;

    const question = newEntry('user', message);
    const answer = newEntry('assistant', '');
    const history = toHistory([...entries, question]);

    setInput('');
    setError('');
    setEntries((current) => [...current, question, answer]);
    setStatus('thinking');
    pinned.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    const update = (change: (entry: ChatEntry) => ChatEntry) => {
      setEntries((current) => current.map((entry) => (entry.id === answer.id ? change(entry) : entry)));
    };

    try {
      await streamRebornAi(history, controller.signal, (event) => {
        if (event.type === 'status') setStatus(event.state);
        if (event.type === 'reset') update((entry) => ({ ...entry, content: '' }));
        if (event.type === 'text') update((entry) => ({ ...entry, content: entry.content + event.delta }));
        if (event.type === 'blocks') update((entry) => ({ ...entry, blocks: event.blocks }));
        if (event.type === 'error') setError(event.message);
      });
    } catch (issue) {
      if (!(issue instanceof DOMException && issue.name === 'AbortError')) setError('connection dropped, try again');
    } finally {
      abortRef.current = null;
      setStatus(null);
      setEntries((current) => current.filter((entry) => entry.id !== answer.id || entry.content.trim() || entry.blocks.length));
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus(null);
  };

  const reset = () => {
    stop();
    setEntries([]);
    setError('');
    setInput('');
  };

  return (
    <div className="ai-page">
      <section className="ai-chat">
        <header className="ai-bar">
          <Avatar className="ai-bar__avatar">
            <AvatarImage src={images.logo.ai} alt="" />
            <AvatarFallback>R</AvatarFallback>
          </Avatar>
          <span className="ai-bar__name">Reborn AI</span>
          <span className="ai-tag">BOT</span>
          <Button className="ai-bar__reset" type="button" aria-label="Clear chat" disabled={!entries.length || busy} onClick={reset}>
            <RotateCcw aria-hidden="true" />
          </Button>
        </header>

        <div
          className="ai-thread"
          ref={threadRef}
          aria-live="polite"
          aria-busy={busy}
          onScroll={(event) => {
            const thread = event.currentTarget;
            pinned.current = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 64;
          }}
        >
          <div className="ai-intro">
            <span className="ai-intro__mark" style={{ backgroundImage: `url(${images.logo.ai})` }} aria-hidden="true" />
            <h2>Reborn AI</h2>
            <p>ask about techs, time trials, world records, crafting, or anything else in the game.</p>
          </div>

          {entries.map((entry, index) => (
            <Row
              entry={entry}
              key={entry.id}
              who={entry.role === 'user' ? you : bot}
              status={busy && index === entries.length - 1 && entry.role === 'assistant' ? status : null}
            />
          ))}
        </div>

        {error ? <div className="ai-error">{error}</div> : null}

        <form
          className="ai-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <div className="ai-input">
            <textarea
              ref={fieldRef}
              value={input}
              rows={1}
              maxLength={limits.maxMessageChars}
              placeholder="Message @Reborn AI"
              aria-label="Message Reborn AI"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) return;
                event.preventDefault();
                void send(input);
              }}
            />
            {busy ? (
              <Button className="ai-send ai-send--stop" type="button" aria-label="Stop" onClick={stop}>
                <Square aria-hidden="true" />
              </Button>
            ) : (
              <Button className="ai-send" type="submit" aria-label="Send" disabled={!input.trim()}>
                <ArrowUp aria-hidden="true" />
              </Button>
            )}
          </div>
          <p className="ai-hint">can get things wrong, double check anything important</p>
        </form>
      </section>
    </div>
  );
}
