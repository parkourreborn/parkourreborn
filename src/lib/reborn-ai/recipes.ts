import { craftingGrid, craftingSlot } from '@/lib/pages/crafting';
import type { AssistantBlock, KnowledgeDoc, RecipeItem } from '@/lib/reborn-ai/types';

export type Recipe = {
  item: string;
  middle: string;
  items: RecipeItem[];
};

const heading = /^##\s+(.+)$/;
const bullet = /^[*-]\s+(.+)$/;
const middleLine = /^middle:\s*(.+)$/i;
const amountLine = /^(.+?)\s*[×x]\s*(\d+)$/i;

function parseDoc(body: string) {
  const recipes: Recipe[] = [];
  let item = '';
  let middle = '';
  let items: RecipeItem[] = [];
  let inside = false;

  const flush = () => {
    if (item && middle) recipes.push({ item, middle, items });
    middle = '';
    items = [];
    inside = false;
  };

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const head = line.match(heading);

    if (head) {
      flush();
      item = head[1].trim();
      continue;
    }

    if (/^recipe:?$/i.test(line)) {
      inside = true;
      continue;
    }

    if (!inside) continue;

    const part = line.match(bullet);
    if (!part) {
      if (line) inside = false;
      continue;
    }

    const core = part[1].match(middleLine);
    if (core) {
      middle = core[1].trim();
      continue;
    }

    const amount = part[1].match(amountLine);
    if (amount) items.push({ name: amount[1].trim(), quantity: Number(amount[2]) });
    else items.push({ name: part[1].trim(), quantity: 1 });
  }

  flush();
  return recipes;
}

export function parseRecipes(docs: KnowledgeDoc[]) {
  return docs
    .filter((doc) => doc.category === 'crafting')
    .flatMap((doc) => parseDoc(doc.body));
}

export function hideRecipes(body: string) {
  const lines: string[] = [];
  let item = '';
  let inside = false;
  let noted = false;

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const head = line.match(heading);

    if (head) {
      item = head[1].trim();
      inside = false;
      lines.push(raw);
      continue;
    }

    if (/^recipe:?$/i.test(line)) {
      inside = true;
      noted = false;
      continue;
    }

    if (!inside || !line) {
      lines.push(raw);
      continue;
    }

    if (!bullet.test(line)) {
      inside = false;
      lines.push(raw);
      continue;
    }

    if (noted) continue;
    noted = true;
    lines.push(`Recipe: withheld on purpose. Call show with a recipe block for "${item}" and the grid card lays it out. Never guess at or describe what goes in it.`);
  }

  return lines.join('\n');
}

export const recipeBlock = (recipe: Recipe): AssistantBlock => ({
  type: 'recipe',
  item: recipe.item,
  middle: craftingSlot(recipe.middle),
  slots: craftingGrid(recipe.items),
});
