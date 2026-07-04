const DEFAULT_APP_URL = 'http://localhost:3000';

const appUrlInput = document.getElementById('appUrl');
const bridgeTokenInput = document.getElementById('bridgeToken');
const courseCodeInput = document.getElementById('courseCode');
const statusBox = document.getElementById('status');
const syncBaseButton = document.getElementById('syncBase');
const syncClassButton = document.getElementById('syncClass');
const saveOnlyButton = document.getElementById('saveOnly');

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle('error', isError);
}

function normalizeAppUrl() {
  return (appUrlInput.value || DEFAULT_APP_URL).replace(/\/+$/, '');
}

async function saveSettings() {
  await chrome.storage.local.set({
    appUrl: normalizeAppUrl(),
    bridgeToken: bridgeTokenInput.value.trim()
  });
}

async function getActivePortalTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith('https://portal.ut.edu.vn/')) {
    throw new Error('Hãy mở tab https://portal.ut.edu.vn đã đăng nhập rồi bấm extension trên tab đó.');
  }
  return tab;
}

function findJwtInStorage() {
  const candidates = [];
  const visitValue = (value) => {
    if (typeof value !== 'string') return;
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
      candidates.push(value);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        Object.values(parsed).forEach(visitValue);
      }
    } catch {
      // Not JSON, ignore.
    }
  };

  [localStorage, sessionStorage].forEach((storage) => {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) visitValue(storage.getItem(key));
    }
  });

  return candidates[0] || null;
}

async function readPortalJwt() {
  const tab = await getActivePortalTab();
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: findJwtInStorage
  });
  return result?.result || null;
}

async function portalApi(path) {
  const jwt = await readPortalJwt();
  const headers = { Accept: 'application/json' };
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  const response = await fetch(`https://portal.ut.edu.vn/api/v1${path}`, {
    credentials: 'include',
    headers
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`UTH trả về dữ liệu không phải JSON (${response.status})`);
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || `UTH API lỗi ${response.status}`);
  }

  return data.body;
}

async function postSnapshot(partialSnapshot) {
  await saveSettings();
  const appUrl = normalizeAppUrl();
  const bridgeToken = bridgeTokenInput.value.trim();
  if (!bridgeToken) throw new Error('Thiếu bridge token');

  const response = await fetch(`${appUrl}/api/portal-bridge/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bridgeToken,
      snapshot: partialSnapshot
    })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không gửi được dữ liệu về app');
  }
  return data;
}

async function syncDashboard() {
  syncBaseButton.disabled = true;
  syncClassButton.disabled = true;
  setStatus('Đang đọc dữ liệu từ UTH Portal...');

  try {
    const periods = await portalApi('/dkhp/getDot');
    const activePeriod = periods.find((period) => period.isDangKyHocPhan)
      || periods.find((period) => !period.isHanCheDot)
      || periods[0];
    const idDot = activePeriod?.id || null;

    const [availableCourses, registeredCourses, studentInfo, studentImage] = await Promise.all([
      idDot ? portalApi(`/dkhp/getHocPhanHocMoi?idDot=${idDot}`).catch(() => []) : [],
      idDot ? portalApi(`/dkhp/getLHPDaDangKy?idDot=${idDot}`).catch(() => []) : [],
      portalApi('/user/getSummaryProfile').catch(() => null),
      portalApi('/user/image').catch(() => null)
    ]);

    const snapshot = {
      idDot,
      periods,
      availableCourses,
      registeredCourses,
      studentInfo,
      studentImage,
      syncedAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ lastSnapshot: snapshot });
    await postSnapshot(snapshot);

    setStatus(`Đã sync dashboard.\nMôn có thể ĐK: ${availableCourses.length}\nĐã đăng ký: ${registeredCourses.length}`);
  } catch (error) {
    setStatus(error.message || 'Sync thất bại', true);
  } finally {
    syncBaseButton.disabled = false;
    syncClassButton.disabled = false;
  }
}

async function syncClassSections() {
  const maHocPhan = courseCodeInput.value.trim();
  if (!maHocPhan) {
    setStatus('Nhập mã học phần trước khi sync lớp.', true);
    return;
  }

  syncBaseButton.disabled = true;
  syncClassButton.disabled = true;
  setStatus(`Đang sync lớp cho ${maHocPhan}...`);

  try {
    const { lastSnapshot } = await chrome.storage.local.get(['lastSnapshot']);
    let idDot = lastSnapshot?.idDot;
    if (!idDot) {
      const periods = await portalApi('/dkhp/getDot');
      idDot = (periods.find((period) => period.isDangKyHocPhan)
        || periods.find((period) => !period.isHanCheDot)
        || periods[0])?.id;
    }

    if (!idDot) throw new Error('Không tìm thấy đợt đăng ký');

    const classes = await portalApi(`/dkhp/getLopHocPhanChoDangKy?idDot=${idDot}&maHocPhan=${encodeURIComponent(maHocPhan)}&isLocTrung=false&isLocTrungWithoutElearning=false`);
    const snapshot = {
      idDot,
      classSections: {
        [maHocPhan]: classes
      },
      syncedAt: new Date().toISOString()
    };

    await chrome.storage.local.set({
      lastSnapshot: {
        ...(lastSnapshot || {}),
        idDot,
        classSections: {
          ...(lastSnapshot?.classSections || {}),
          [maHocPhan]: classes
        },
        syncedAt: snapshot.syncedAt
      }
    });
    await postSnapshot(snapshot);

    setStatus(`Đã sync ${classes.length} lớp cho ${maHocPhan}.`);
  } catch (error) {
    setStatus(error.message || 'Sync lớp thất bại', true);
  } finally {
    syncBaseButton.disabled = false;
    syncClassButton.disabled = false;
  }
}

async function init() {
  const { appUrl, bridgeToken } = await chrome.storage.local.get(['appUrl', 'bridgeToken']);
  appUrlInput.value = appUrl || DEFAULT_APP_URL;
  bridgeTokenInput.value = bridgeToken || '';
}

syncBaseButton.addEventListener('click', syncDashboard);
syncClassButton.addEventListener('click', syncClassSections);
saveOnlyButton.addEventListener('click', async () => {
  await saveSettings();
  setStatus('Đã lưu App URL và bridge token.');
});

init();
