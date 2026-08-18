import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Floating Menu block
 * Authored as a repeatable table: each row = one menu item
 * Columns per row: Text | Icon (code) | Link
 */
export default function decorate(block) {
  const items = [...block.children]
    .map((row) => {
      const cells = [...row.children];
      const [textCell, iconCell, linkCell] = cells;

      const anchorInText = textCell?.querySelector('a');
      const label = (anchorInText?.textContent || textCell?.textContent || '').trim();
      const icon = (iconCell?.textContent || '').trim();
      const href = (
        linkCell?.querySelector('a')?.getAttribute('href')
        || linkCell?.textContent
        || anchorInText?.getAttribute('href')
        || '#'
      ).trim();

      return {
        label, icon, href, row,
      };
    });

  // clear the authored table markup, we rebuild the original structure below
  block.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'a11y';
  heading.textContent = 'Quick Menu';

  const list = document.createElement('ul');
  list.className = 'floating-menu-list';

  items.forEach(({
    label, icon, href, row,
  }) => {
    const li = document.createElement('li');
    li.className = 'floating-menu-item';
    moveInstrumentation(row, li);

    const a = document.createElement('a');
    a.className = 'floating-menu-link';
    a.href = href;

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = label;

    const iconEl = document.createElement('span');
    // icon field holds the icon class code, e.g. "icon-handle" — reuses existing icon font CSS
    iconEl.className = `icon${icon ? ` ${icon}` : ''}`;

    a.append(text, iconEl);
    li.append(a);
    list.append(li);
  });

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cta-toggle';

  const buttonIcon = document.createElement('span');
  buttonIcon.className = 'button-icon';

  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'a11y';
  toggleLabel.textContent = 'Open';

  toggle.append(buttonIcon, toggleLabel);

  const circle = document.createElement('div');
  circle.className = 'circle';

  block.append(heading, list, toggle, circle);

  toggle.addEventListener('click', () => {
    block.classList.toggle('is-active');
  });
}
