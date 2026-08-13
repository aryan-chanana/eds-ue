import { moveInstrumentation } from '../../scripts/scripts.js';

const SOLO_THRESHOLD_MONTHS = 12;

function parseBoolean(text) {
  return /^(true|yes|on|1)$/i.test((text || '').trim());
}

export default function decorate(block) {
  const rows = [...block.children];
  const [headingRow, ...projectRows] = rows;

  const heading = document.createElement('h2');
  heading.className = 'projects-heading';
  if (headingRow) {
    moveInstrumentation(headingRow, heading);
    heading.textContent = headingRow.textContent.trim();
    headingRow.remove();
  }

  const ul = document.createElement('ul');
  ul.className = 'projects-cards';

  projectRows.forEach((row) => {
    const [nameCell, durationCell, soloCell] = [...row.children];
    const name = nameCell ? nameCell.textContent.trim() : '';
    const rawDuration = durationCell ? durationCell.textContent.trim() : '';
    const duration = Number.parseInt(rawDuration, 10);
    const isSolo = soloCell ? parseBoolean(soloCell.textContent) : false;

    const li = document.createElement('li');
    li.className = 'projects-card';
    if (Number.isFinite(duration)) {
      li.classList.add(duration < SOLO_THRESHOLD_MONTHS ? 'is-short' : 'is-long');
    }
    if (isSolo) li.classList.add('is-solo');
    moveInstrumentation(row, li);

    const header = document.createElement('div');
    header.className = 'projects-card-header';

    const nameEl = document.createElement('h3');
    nameEl.className = 'projects-card-name';
    nameEl.textContent = name;
    if (nameCell) moveInstrumentation(nameCell, nameEl);
    header.append(nameEl);

    if (isSolo) {
      const icon = document.createElement('span');
      icon.className = 'projects-solo-icon';
      icon.setAttribute('role', 'img');
      icon.setAttribute('aria-label', 'Solo project');
      icon.title = 'Solo project';
      header.append(icon);
    }

    const durationEl = document.createElement('p');
    durationEl.className = 'projects-card-duration';
    if (Number.isFinite(duration)) {
      const label = duration === 1 ? 'month' : 'months';
      durationEl.textContent = `${duration} ${label}`;
    } else {
      durationEl.textContent = rawDuration;
    }
    if (durationCell) moveInstrumentation(durationCell, durationEl);

    li.append(header, durationEl);

    if (soloCell) soloCell.remove();
    ul.append(li);
  });

  block.replaceChildren(heading, ul);
}
