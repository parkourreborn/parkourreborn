import { craftingGrid, craftingSlot } from '@/lib/pages/crafting';
import type { KbRecipe } from '@/lib/reborn-ai/kb-search';
import type { AssistantBlock } from '@/lib/reborn-ai/types';

// Recipes are pulled out of the crafting docs by scripts/kb/build.mjs; this
// turns one into the grid card the chat shows.
// One recipe as a fact for the model.
export const recipeFact = (recipe: KbRecipe) => ({
  item: recipe.item,
  middleSlot: recipe.middle,
  otherIngredients: recipe.items.map((ingredient) => `${ingredient.name} x${ingredient.quantity}`).join(', '),
});

export const recipeBlock = (recipe: KbRecipe): AssistantBlock => ({
  type: 'recipe',
  item: recipe.item,
  middle: craftingSlot(recipe.middle),
  slots: craftingGrid(recipe.items),
});
