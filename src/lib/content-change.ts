import type { Content } from "./content";
// Recovery is an explicit archive toggle. Saving must never silently erase existing content.
export function removedContent(previous: Content, next: Content) {
  const missing: string[] = [];
  const pageSlugs = new Set(next.pages.map((p) => p.slug));
  for (const page of previous.pages) {
    if (!pageSlugs.has(page.slug)) {
      missing.push(`page /${page.slug}`);
      continue;
    }
    const updated = next.pages.find((p) => p.slug === page.slug)!;
    const ids = new Set(
      [...updated.blocks, ...updated.archive].map((b) => b.id),
    );
    for (const block of [...page.blocks, ...page.archive])
      if (!ids.has(block.id)) missing.push(`block ${block.id}`);
  }
  const ids = new Set(
    next.sections.flatMap((s) => [s.id, ...s.items.map((i) => i.id)]),
  );
  for (const section of previous.sections)
    for (const id of [section.id, ...section.items.map((i) => i.id)])
      if (!ids.has(id)) missing.push(id);
  const navigationIds = new Set(next.navigation.map((n) => n.id));
  for (const form of previous.forms) {
    const updated = next.forms.find((candidate) => candidate.id === form.id);
    if (!updated) missing.push(`form ${form.id}`);
    else
      for (const question of form.questions)
        if (
          !updated.questions.some((candidate) => candidate.id === question.id)
        )
          missing.push(`question ${question.id}`);
  }
  for (const entry of previous.navigation)
    if (!navigationIds.has(entry.id)) missing.push(`navigation ${entry.id}`);
  return missing;
}
