import { scaleMotionTime } from './motion.js';

const SPARK_STEPS = 18;

let activeInterval = null;
let helpers = null;

function shuffle(items) {

  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// 섞은 뒤 앞에서부터 groupSize명씩 자르고, 모자란 끝부분은 남은 사람으로 둔다.
export function makeGroups(entries, groupSize) {

  const shuffled = shuffle(entries);
  const fullCount =
    Math.floor(shuffled.length / groupSize) * groupSize;
  const groups = [];

  for (let i = 0; i < fullCount; i += groupSize) {
    groups.push(shuffled.slice(i, i + groupSize));
  }

  return { groups, leftovers: shuffled.slice(fullCount) };
}

// 황금각(137.5도)씩 색상을 돌려 이웃한 모둠끼리 색이 겹치지 않게 한다.
function getGroupColor(index) {
  return `hsl(${Math.round((index * 137.5) % 360)}, 72%, 52%)`;
}

function renderGroupCards(container, groups, leftovers) {

  container.textContent = '';
  container.classList.add('pair-result-list');

  const list = document.createElement('div');
  list.className = 'pair-cards';

  const addCard = (title, entries, color) => {
    const card = document.createElement('div');
    card.className = 'pair-card';
    card.style.setProperty('--pair-color', color);

    const heading = document.createElement('strong');
    heading.textContent = title;

    const members = document.createElement('span');
    members.className = 'pair-members';

    entries.forEach((entry, index) => {
      const member = document.createElement('span');
      member.className = 'pair-member';
      member.textContent = helpers.getResultLabel(entry.item) +
        (index < entries.length - 1 ? ',' : '');
      members.appendChild(member);
    });

    card.append(heading, members);
    list.appendChild(card);
  };

  groups.forEach((group, index) => {
    addCard(`${index + 1}모둠`, group, getGroupColor(index));
  });

  if (leftovers.length > 0) {
    addCard('남은 사람', leftovers, '#8a94a6');
  }

  container.appendChild(list);
}

function colorCells(groups) {

  const cells = Array.from(
    helpers.numberGrid.querySelectorAll('.number-cell')
  );

  groups.forEach((group, index) => {
    group.forEach((entry) => {
      const cell =
        cells.find((item) => item.dataset.key === entry.key);

      if (!cell) return;

      cell.classList.add('pair-grouped');
      cell.style.setProperty('--pair-color', getGroupColor(index));
      cell.title = `${entry.item} · ${index + 1}모둠`;
    });
  });
}

function showNotice(message) {
  helpers.numberDisplay.textContent = message;
  helpers.numberDisplay.classList.remove('placeholder');
  helpers.numberDisplay.classList.add('notice');
}

export function setupPairingMode(options) {
  helpers = options;
}

export function drawPairing({ entries, blockedItems, groupSize }) {

  if (!helpers) return;

  resetPairingMode();

  const blocked = new Set(blockedItems);
  const candidates =
    entries.filter((entry) => !blocked.has(entry.key));

  if (candidates.length < groupSize) {
    showNotice(
      `${groupSize}명씩 짝을 지으려면 최소 ${groupSize}명이 필요합니다.`
    );
    return;
  }

  const { drawButton, numberGrid, numberDisplay, bigNumber, bigOverlay } =
    helpers;
  const candidateKeys = new Set(candidates.map((entry) => entry.key));
  const cells = Array.from(numberGrid.querySelectorAll('.number-cell'))
    .filter((cell) => candidateKeys.has(cell.dataset.key));

  drawButton.disabled = true;

  let step = 0;
  let prev = null;

  activeInterval = setInterval(() => {

    prev?.classList.remove('spark');
    prev = cells[Math.floor(Math.random() * cells.length)];
    prev?.classList.add('spark');

    if (step % 3 === 0) helpers.playDrawTick();

    step += 1;

    if (step < SPARK_STEPS) return;

    clearInterval(activeInterval);
    activeInterval = null;
    prev?.classList.remove('spark');

    const { groups, leftovers } = makeGroups(candidates, groupSize);

    colorCells(groups);

    numberDisplay.classList.remove('placeholder', 'notice');
    numberDisplay.style.fontSize = '';
    renderGroupCards(numberDisplay, groups, leftovers);

    bigNumber.style.fontSize = '';
    renderGroupCards(bigNumber, groups, leftovers);
    bigOverlay.classList.add('show');

    drawButton.disabled = false;
    helpers.playSound();
  }, scaleMotionTime(110));
}

export function resetPairingMode() {

  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  if (!helpers) return;

  helpers.drawButton.disabled = false;
  helpers.numberDisplay.classList.remove('pair-result-list');
  helpers.bigNumber.classList.remove('pair-result-list');

  helpers.numberGrid
    .querySelectorAll('.number-cell')
    .forEach((cell) => {
      if (cell.classList.contains('pair-grouped')) {
        cell.title = cell.dataset.num;
      }
      cell.classList.remove('pair-grouped', 'spark');
      cell.style.removeProperty('--pair-color');
    });
}
