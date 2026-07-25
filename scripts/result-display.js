function countItems(items) {
  const counts = new Map();
  for (const item of items) {
    const label = String(item);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return counts;
}

export const RESULT_SUMMARY_LIMIT = 50;

export function formatResultSummary(
  items,
  limit = RESULT_SUMMARY_LIMIT
) {
  const labels = items.map(String);
  if (labels.length <= limit) return labels.join(', ');

  const groups = Array.from(countItems(labels));
  const visible = groups.slice(0, 8).map(([label, count]) =>
    count > 1 ? `${label} × ${count}` : label
  );
  if (groups.length > visible.length) {
    visible.push(`외 ${groups.length - visible.length}종류`);
  }
  return `${visible.join(', ')} (총 ${labels.length}명)`;
}

export function renderResultSummary(
  container,
  items,
  limit = RESULT_SUMMARY_LIMIT
) {
  const labels = items.map(String);
  const isSummary = labels.length > limit;
  container.classList.toggle('result-summary-list', isSummary);

  if (!isSummary) {
    container.textContent = labels.join(', ');
    return false;
  }

  container.innerHTML = '';
  const total = document.createElement('strong');
  total.className = 'result-summary-row result-summary-total';
  total.textContent = `총 ${labels.length}명`;
  container.appendChild(total);

  const groups = Array.from(countItems(labels));
  const visible = groups.slice(0, 200);
  for (const [label, count] of visible) {
    const row = document.createElement('span');
    row.className = 'result-summary-row';
    row.textContent = count > 1 ? `${label} × ${count}` : label;
    container.appendChild(row);
  }

  if (groups.length > visible.length) {
    const more = document.createElement('span');
    more.className = 'result-summary-row result-summary-more';
    more.textContent = `외 ${groups.length - visible.length}종류`;
    container.appendChild(more);
  }
  return true;
}

export function renderPickedSummary(container, items) {
  container.innerHTML = '';
  if (items.length === 0) {
    container.textContent = '아직 뽑은 번호가 없습니다.';
    return;
  }

  const groups = Array.from(countItems(items));
  const visible = groups.slice(0, 60);
  for (const [label, count] of visible) {
    const tag = document.createElement('span');
    tag.textContent = count > 1 ? `${label} × ${count}` : label;
    tag.title = count > 1 ? `${label}이(가) ${count}번 뽑힘` : label;
    container.appendChild(tag);
  }

  if (groups.length > visible.length) {
    const more = document.createElement('span');
    more.textContent = `외 ${groups.length - visible.length}종류`;
    container.appendChild(more);
  }
}
