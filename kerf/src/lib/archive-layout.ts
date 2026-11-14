export function archiveRows<T extends { ratio: number; rowEnd: boolean }>(
  items: T[],
  width: number,
  gap = 10,
) {
  const rows: { items: T[]; height: number }[] = [];
  let row: T[] = [];
  for (const item of items) {
    row.push(item);
    if (item.rowEnd || width < 768) {
      rows.push({
        items: row,
        height:
          (width - gap * (row.length - 1)) /
          row.reduce((sum, i) => sum + i.ratio, 0),
      });
      row = [];
    }
  }
  if (row.length)
    rows.push({
      items: row,
      height:
        (width - gap * (row.length - 1)) /
        row.reduce((sum, i) => sum + i.ratio, 0),
    });
  return rows;
}
