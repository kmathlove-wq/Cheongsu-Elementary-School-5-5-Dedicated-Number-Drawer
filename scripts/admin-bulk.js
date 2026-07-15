const manageView = document.getElementById('adminManageView');
const adminCloseTrigger = document.getElementById('adminCloseButton');
const bulkOverlay = document.getElementById('adminBulkOverlay');
const bulkForm = document.getElementById('adminBulkForm');
const bulkNumber = document.getElementById('adminBulkNumber');
const bulkCount = document.getElementById('adminBulkCount');
const bulkError = document.getElementById('adminBulkError');
const deleteForm = document.getElementById('adminBulkDeleteForm');
const deleteStart = document.getElementById('adminBulkDeleteStart');
const deleteEnd = document.getElementById('adminBulkDeleteEnd');
const deleteError = document.getElementById('adminBulkDeleteError');
const bulkClose = document.getElementById('adminBulkClose');
const bulkCancel = document.getElementById('adminBulkCancel');

const CLICK_WINDOW = 650;
const CLICK_COUNT = 3;
const MAX_BULK_COUNT = 10000;

let recentClicks = [];
let closeTimer = null;

function openBulkAdmin() {
  bulkError.textContent = '';
  deleteError.textContent = '';
  bulkNumber.value = '';
  bulkCount.value = '1000';
  deleteStart.value = '';
  deleteEnd.value = '';
  bulkOverlay.classList.add('show');
  bulkOverlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => bulkNumber.focus(), 0);
}

function resetCloseClicks() {
  recentClicks = [];
  clearTimeout(closeTimer);
  closeTimer = null;
}

function closeBulkAdmin() {
  bulkOverlay.classList.remove('show');
  bulkOverlay.setAttribute('aria-hidden', 'true');
  resetCloseClicks();
}

function remapOptionKeys(keys, indexMap) {
  return keys
    .map((key) => indexMap.get(Number(key)))
    .filter((key) => key !== undefined)
    .map(String);
}

export function createRangeDeletion(
  items, forcedItems, blockedItems, start, end, isProtected
) {
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  const remove = new Set();
  items.forEach((item, index) => {
    const number = Number(item);
    if (Number.isInteger(number) && number >= low && number <= high &&
        !isProtected(item, index)) remove.add(index);
  });
  if (remove.size === items.length) remove.delete(0);

  const indexMap = new Map();
  const nextItems = [];
  items.forEach((item, index) => {
    if (remove.has(index)) return;
    indexMap.set(index, nextItems.length);
    nextItems.push(item);
  });
  return {
    items: nextItems,
    forcedItems: remapOptionKeys(forcedItems, indexMap),
    blockedItems: remapOptionKeys(blockedItems, indexMap),
    removed: remove.size,
  };
}

export function setupAdminBulkMode({ addItems, deleteRange, closeParent }) {
  adminCloseTrigger.addEventListener('click', (event) => {
    if (manageView.hidden) {
      closeParent();
      return;
    }
    event.preventDefault();
    const now = performance.now();
    recentClicks = recentClicks.filter((time) => now - time <= CLICK_WINDOW);
    recentClicks.push(now);
    clearTimeout(closeTimer);

    if (recentClicks.length >= CLICK_COUNT) {
      resetCloseClicks();
      openBulkAdmin();
      return;
    }
    closeTimer = setTimeout(() => {
      resetCloseClicks();
      closeParent();
    }, CLICK_WINDOW);
  });

  bulkForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const item = bulkNumber.value.trim();
    const count = Number(bulkCount.value);
    if (!/^\d+$/.test(item)) {
      bulkError.textContent = '번호는 0 이상의 정수로 입력해 주세요.';
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > MAX_BULK_COUNT) {
      bulkError.textContent = `개수는 1~${MAX_BULK_COUNT} 사이로 입력해 주세요.`;
      return;
    }
    if (addItems(item, count)) closeBulkAdmin();
    else bulkError.textContent = '현재 모드에 이 번호를 추가할 수 없습니다.';
  });

  deleteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const start = Number(deleteStart.value);
    const end = Number(deleteEnd.value);
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      deleteError.textContent = '시작 번호와 끝 번호를 정수로 입력해 주세요.';
      return;
    }
    if (deleteRange(start, end)) closeBulkAdmin();
    else deleteError.textContent = '해당 범위에서 삭제할 번호가 없습니다.';
  });

  bulkClose.addEventListener('click', closeBulkAdmin);
  bulkCancel.addEventListener('click', closeBulkAdmin);
  bulkOverlay.addEventListener('click', (event) => {
    if (event.target === bulkOverlay) closeBulkAdmin();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && bulkOverlay.classList.contains('show')) {
      event.stopImmediatePropagation();
      closeBulkAdmin();
    }
  }, true);
}
