const parentOverlay = document.getElementById('adminOverlay');
const manageView = document.getElementById('adminManageView');
const bulkOverlay = document.getElementById('adminBulkOverlay');
const bulkForm = document.getElementById('adminBulkForm');
const bulkNumber = document.getElementById('adminBulkNumber');
const bulkCount = document.getElementById('adminBulkCount');
const bulkError = document.getElementById('adminBulkError');
const bulkClose = document.getElementById('adminBulkClose');
const bulkCancel = document.getElementById('adminBulkCancel');

const CLICK_WINDOW = 650;
const CLICK_COUNT = 3;
const MAX_BULK_COUNT = 10000;

let recentClicks = [];

function isAdminManageOpen() {
  return parentOverlay.classList.contains('show') &&
    !manageView.hidden &&
    !bulkOverlay.classList.contains('show');
}

function openBulkAdmin() {
  bulkError.textContent = '';
  bulkNumber.value = '';
  bulkCount.value = '1000';
  bulkOverlay.classList.add('show');
  bulkOverlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => bulkNumber.focus(), 0);
}

function closeBulkAdmin() {
  bulkOverlay.classList.remove('show');
  bulkOverlay.setAttribute('aria-hidden', 'true');
  recentClicks = [];
}

export function setupAdminBulkMode(addItems) {
  document.addEventListener('pointerup', (event) => {
    if (!isAdminManageOpen() || !manageView.contains(event.target)) {
      recentClicks = [];
      return;
    }

    const now = performance.now();
    recentClicks = recentClicks.filter((time) => now - time <= CLICK_WINDOW);
    recentClicks.push(now);

    if (recentClicks.length >= CLICK_COUNT) {
      recentClicks = [];
      openBulkAdmin();
    }
  }, true);

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

    if (addItems(item, count)) {
      closeBulkAdmin();
    } else {
      bulkError.textContent = '현재 모드에 이 번호를 추가할 수 없습니다.';
    }
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
