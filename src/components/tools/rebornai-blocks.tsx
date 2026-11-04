'use client';

import RichText from '@/components/tools/rebornai-text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { images } from '@/lib/assets';
import { craftingSlots } from '@/lib/pages/crafting';
import { kindLabels, parseStep, previewKind, youtubeEmbedUrl } from '@/lib/pages/techlist';
import type { AssistantBlock, RecipeSlot } from '@/lib/reborn-ai/types';

type BlockProps = {
  block: AssistantBlock;
};

const medals = [
  [images.elements.timetrials.bronze, 'bronze'],
  [images.elements.timetrials.silver, 'silver'],
  [images.elements.timetrials.gold, 'gold'],
  [images.elements.timetrials.platinum, 'platinum'],
] as const;

function Media({ url, title }: { url: string; title?: string }) {
  const embed = youtubeEmbedUrl(url);
  if (embed) return <iframe src={embed} title={title || 'Video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;

  const kind = previewKind(url);
  if (kind === 'image') return <img src={url} alt={title || ''} loading="lazy" />;
  return <video src={url} controls playsInline preload="metadata" />;
}

function TechBlock({ block }: { block: Extract<AssistantBlock, { type: 'tech' }> }) {
  const steps = block.steps.map(parseStep).filter((step) => !step.add);

  return (
    <div className="ai-card">
      <header className="ai-card__head">
        <span>{kindLabels[block.kind]}</span>
        <strong>{block.name}</strong>
        {block.aliases.length ? <small>{block.aliases.join(', ')}</small> : null}
      </header>

      {steps.length ? (
        <div className="ai-steps">
          {steps.map((step, index) => (
            <span className="ai-step-wrap" key={`${step.label}-${index}`}>
              <span className={`ai-step${step.optional ? ' is-optional' : ''}`}>{step.label}{step.optional ? <b aria-hidden="true">*</b> : null}</span>
              {index < steps.length - 1 ? <span className="ai-step-arrow" aria-hidden="true">&rarr;</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      {block.videoUrl ? <div className="ai-media"><Media url={block.videoUrl} title={block.name} /></div> : null}
      {block.tutorialUrl ? <a className="ai-card__link" href={block.tutorialUrl} target="_blank" rel="noopener noreferrer">Tutorial</a> : null}
    </div>
  );
}

function TrialBlock({ block }: { block: Extract<AssistantBlock, { type: 'time_trial' }> }) {
  const times = [block.bronze, block.silver, block.gold, block.platinum];

  return (
    <div className="ai-card">
      <header className="ai-card__head">
        <span>{block.district}</span>
        <strong>{block.name}</strong>
        <small>{block.difficulty}</small>
      </header>

      {block.location ? <p className="ai-card__note">{block.location}</p> : null}

      <div className="ai-medals">
        {medals.map(([icon, label], index) => (
          <span className="ai-medal" key={label}>
            <span className="ai-medal__icon" style={{ backgroundImage: `url(${icon})` }} aria-hidden="true" />
            <strong>{times[index]}</strong>
          </span>
        ))}
      </div>

      {block.videoUrl ? <div className="ai-media"><Media url={block.videoUrl} title={block.name} /></div> : null}
    </div>
  );
}

function RecordBlock({ block }: { block: Extract<AssistantBlock, { type: 'world_record' }> }) {
  return (
    <div className="ai-card ai-card--wr">
      <header className="ai-card__head">
        <span>World Record</span>
        <strong>{block.trial}</strong>
      </header>

      <div className="ai-wr">
        <span className="ai-wr__icon" style={{ backgroundImage: `url(${images.elements.timetrials.worldrecord})` }} aria-hidden="true" />
        <div>
          <strong>{block.time}</strong>
          <small>{block.player}</small>
        </div>
        {block.wasansScore ? <span className="ai-wr__score">{block.wasansScore}<small>Wasans</small></span> : null}
      </div>

      {block.videoUrl ? <div className="ai-media"><Media url={block.videoUrl} title={`${block.trial} world record`} /></div> : null}
      {block.submissionUrl ? <a className="ai-card__link" href={block.submissionUrl} target="_blank" rel="noopener noreferrer">View submission</a> : null}
    </div>
  );
}

function Hex({ slot, core = false }: { slot: RecipeSlot | null; core?: boolean }) {
  const className = `ai-hex${core ? ' ai-hex--core' : ''}${slot ? '' : ' is-empty'}`;
  if (!slot) return <span className={className} aria-hidden="true" />;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className={className} type="button" aria-label={slot.name}>
          <img src={slot.image} alt="" loading="lazy" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{slot.name}</TooltipContent>
    </Tooltip>
  );
}

function RecipeBlock({ block }: { block: Extract<AssistantBlock, { type: 'recipe' }> }) {
  // Six slots around the core, empty ones still drawn so the grid keeps its shape.
  const ring = Array.from({ length: craftingSlots }, (_, index) => block.slots[index] ?? null);

  return (
    <div className="ai-card">
      <header className="ai-card__head">
        <span>Recipe</span>
        <strong>{block.item}</strong>
      </header>

      <div className="ai-hexgrid">
        <div className="ai-hexrow">
          <Hex slot={ring[0]} />
          <Hex slot={ring[1]} />
        </div>
        <div className="ai-hexrow">
          <Hex slot={ring[2]} />
          <Hex slot={block.middle} core />
          <Hex slot={ring[3]} />
        </div>
        <div className="ai-hexrow">
          <Hex slot={ring[4]} />
          <Hex slot={ring[5]} />
        </div>
      </div>
    </div>
  );
}

function LeaderboardBlock({ block }: { block: Extract<AssistantBlock, { type: 'leaderboard' }> }) {
  return (
    <div className="ai-card">
      <header className="ai-card__head">
        <span>Wasans</span>
        <strong>{block.title}</strong>
        {block.subtitle ? <small>{block.subtitle}</small> : null}
      </header>

      <ol className="ai-board">
        {block.rows.map((row) => (
          <li className={`ai-board__row${row.highlight ? ' is-you' : ''}`} key={`${row.rank}-${row.name}`}>
            <span className="ai-board__rank">{row.rank}</span>
            <span className="ai-board__name">{row.name}{row.note ? <small>{row.note}</small> : null}</span>
            <strong className="ai-board__value">{row.value}</strong>
          </li>
        ))}
      </ol>

      {block.url ? <a className="ai-card__link" href={block.url} target="_blank" rel="noopener noreferrer">Open on Wasans</a> : null}
    </div>
  );
}

function PlayerBlock({ block }: { block: Extract<AssistantBlock, { type: 'player' }> }) {
  return (
    <div className="ai-card">
      <header className="ai-card__head">
        <span>Player</span>
        <strong>{block.name}</strong>
        <small>{[block.rank, block.tier].filter(Boolean).join(' · ')}</small>
      </header>

      <div className="ai-wr">
        <span className="ai-wr__icon" style={{ backgroundImage: `url(${images.elements.timetrials.platinum})` }} aria-hidden="true" />
        <div>
          <strong>{block.score || '—'}</strong>
          <small>Wasans score</small>
        </div>
      </div>

      {block.pbs.length ? (
        <ol className="ai-board">
          {block.pbs.map((pb) => (
            <li className="ai-board__row" key={pb.trial}>
              <span className="ai-board__rank">{pb.rank}</span>
              <span className="ai-board__name">{pb.trial}</span>
              <strong className="ai-board__value">{pb.time}</strong>
            </li>
          ))}
        </ol>
      ) : null}

      <a className="ai-card__link" href={block.url} target="_blank" rel="noopener noreferrer">View profile</a>
    </div>
  );
}

function Block({ block }: BlockProps) {
  if (block.type === 'text') return <div className="ai-text"><RichText value={block.content} /></div>;

  if (block.type === 'link') {
    return (
      <a className="ai-link" href={block.url} target="_blank" rel="noopener noreferrer">
        <strong>{block.title}</strong>
        <small>{block.url}</small>
      </a>
    );
  }

  if (block.type === 'image' || block.type === 'gif') {
    const alt = block.type === 'image' ? block.alt ?? '' : block.title ?? '';

    return (
      <a className="ai-media ai-media--still" href={block.url} target="_blank" rel="noopener noreferrer">
        <img src={block.url} alt={alt} loading="lazy" />
      </a>
    );
  }

  if (block.type === 'video') return <div className="ai-media"><Media url={block.url} title={block.title} /></div>;
  if (block.type === 'tech') return <TechBlock block={block} />;
  if (block.type === 'time_trial') return <TrialBlock block={block} />;
  if (block.type === 'world_record') return <RecordBlock block={block} />;
  if (block.type === 'leaderboard') return <LeaderboardBlock block={block} />;
  if (block.type === 'player') return <PlayerBlock block={block} />;
  return <RecipeBlock block={block} />;
}

export default function Blocks({ blocks }: { blocks: AssistantBlock[] }) {
  if (!blocks.length) return null;

  return (
    <div className="ai-blocks">
      {blocks.map((block, index) => <Block block={block} key={`${block.type}-${index}`} />)}
    </div>
  );
}
