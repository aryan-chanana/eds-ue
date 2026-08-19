const STORAGE_KEY = 'cookies-consent';

function readCells(block) {
  const rows = [...block.children];
  if (rows.length === 0) return { contentSource: null, buttonLabel: '' };
  if (rows.length === 1) {
    const [contentCell, buttonCell] = [...rows[0].children];
    return {
      contentSource: contentCell,
      buttonLabel: (buttonCell?.textContent || '').trim(),
    };
  }
  const [contentRow, buttonRow] = rows;
  return {
    contentSource: contentRow?.firstElementChild || contentRow,
    buttonLabel: (buttonRow?.textContent || '').trim(),
  };
}

export default function decorate(block) {
  const alreadyAccepted = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'accepted';
    } catch {
      return false;
    }
  })();

  if (alreadyAccepted) {
    const wrapper = block.closest('.cookies-wrapper');
    (wrapper || block).remove();
    return;
  }

  const { contentSource, buttonLabel } = readCells(block);

  block.textContent = '';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Cookies consent');

  const content = document.createElement('div');
  content.className = 'cookies-content';
  if (contentSource) {
    while (contentSource.firstChild) content.append(contentSource.firstChild);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cookies-accept';
  button.textContent = buttonLabel || 'Accept & Close';
  button.addEventListener('click', () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // localStorage may be unavailable (private mode / disabled).
      // The banner still closes for this session.
    }
    const wrapper = block.closest('.cookies-wrapper');
    (wrapper || block).remove();
  });

  block.append(content, button);

  // Hoist the block out of its authored section and pin it to <body>.
  // Guarantees position:fixed anchors to the viewport, above every other block.
  const wrapper = block.closest('.cookies-wrapper');
  if (wrapper) wrapper.remove();
  document.body.append(block);

  block.classList.add('cookies-ready');
}
