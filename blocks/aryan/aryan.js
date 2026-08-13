import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const rows = [...block.children];
  const [headingRow, ...projectRows] = rows;

  const heading = document.createElement('h2');
  heading.className = 'aryan-heading';
  if (headingRow) {
    moveInstrumentation(headingRow, heading);
    const value = headingRow.textContent.trim();
    heading.textContent = value;
    headingRow.remove();
  }

  const ul = document.createElement('ul');
  ul.className = 'aryan-cards';
  projectRows.forEach((row) => {
    const [nameCell, durationCell] = [...row.children];
    const name = nameCell ? nameCell.textContent.trim() : '';
    const rawDuration = durationCell ? durationCell.textContent.trim() : '';
    const duration = Number.parseInt(rawDuration, 10);
    const li = document.createElement('li');
    li.className = 'aryan-card';
    moveInstrumentation(row, li);

    const nameEl = document.createElement('h3');
    nameEl.className = 'aryan-card-name';
    nameEl.textContent = name;
    if (nameCell) moveInstrumentation(nameCell, nameEl);

    const durationEl = document.createElement('p');
    durationEl.className = 'aryan-card-duration';
    if (Number.isFinite(duration)) {
      const label = duration === 1 ? 'month' : 'months';
      durationEl.textContent = `${duration} ${label}`;
    } else {
      durationEl.textContent = rawDuration;
    }
    if (durationCell) moveInstrumentation(durationCell, durationEl);

    li.append(nameEl, durationEl);
    ul.append(li);
  });

  block.replaceChildren(heading, ul);
}
