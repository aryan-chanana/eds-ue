import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function pickImage(cell) {
  if (!cell) return null;
  const picture = cell.querySelector('picture');
  if (picture) return picture;
  const img = cell.querySelector('img');
  if (img) {
    const optimized = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    return optimized;
  }
  return null;
}

function decorateCta(anchor, variant) {
  if (!anchor) return null;
  const label = (anchor.textContent || '').trim();
  const href = anchor.getAttribute('href') || '';
  if (!label || !href) return null;
  anchor.className = `explore-range-card-cta explore-range-card-cta-${variant} button`;
  anchor.textContent = label;
  return anchor;
}

function buildCard(row) {
  const [tabCell, imageCell, textCell, ctasCell] = [...row.children];

  const tabLabel = (tabCell?.textContent || '').trim();

  const article = document.createElement('article');
  article.className = 'explore-range-card';
  moveInstrumentation(row, article);

  const media = document.createElement('div');
  media.className = 'explore-range-card-image';
  const picture = pickImage(imageCell);
  if (picture) media.append(picture);

  const body = document.createElement('div');
  body.className = 'explore-range-card-body';

  if (textCell && textCell.innerHTML.trim()) {
    const desc = document.createElement('div');
    desc.className = 'explore-range-card-text';
    while (textCell.firstChild) desc.append(textCell.firstChild);
    body.append(desc);
  }

  const anchors = ctasCell ? [...ctasCell.querySelectorAll('a')] : [];
  const cta1 = decorateCta(anchors[0], 'primary');
  const cta2 = decorateCta(anchors[1], 'secondary');
  if (cta1 || cta2) {
    const ctas = document.createElement('div');
    ctas.className = 'explore-range-card-ctas';
    if (cta1) ctas.append(cta1);
    if (cta2) ctas.append(cta2);
    body.append(ctas);
  }

  article.append(media, body);
  return { tabLabel, article };
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const [headingRow, ...cardRows] = rows;

  const heading = document.createElement('h2');
  heading.className = 'explore-range-heading';
  heading.textContent = (headingRow.textContent || '').trim();
  moveInstrumentation(headingRow, heading);

  const groups = new Map();
  cardRows.forEach((row) => {
    const { tabLabel, article } = buildCard(row);
    const key = tabLabel || 'Tab';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(article);
  });

  const tablist = document.createElement('div');
  tablist.className = 'explore-range-tablist';
  tablist.setAttribute('role', 'tablist');

  const panels = document.createElement('div');
  panels.className = 'explore-range-panels';

  const tabs = [];
  const tabPanels = [];
  const updaters = [];
  [...groups.entries()].forEach(([label, cards], index) => {
    const tabId = `explore-range-tab-${index}`;
    const panelId = `explore-range-panel-${index}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'explore-range-tab';
    button.id = tabId;
    button.textContent = label;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panelId);
    button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    tablist.append(button);
    tabs.push(button);

    const panel = document.createElement('div');
    panel.className = 'explore-range-panel';
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    if (index !== 0) panel.hidden = true;

    const carousel = document.createElement('div');
    carousel.className = 'explore-range-carousel';

    const arrowSvg = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h13m0 0-5-5m5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'explore-range-carousel-arrow explore-range-carousel-prev';
    prev.setAttribute('aria-label', 'Previous cars');
    prev.innerHTML = arrowSvg;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'explore-range-carousel-arrow explore-range-carousel-next';
    next.setAttribute('aria-label', 'Next cars');
    next.innerHTML = arrowSvg;

    const track = document.createElement('div');
    track.className = 'explore-range-track';
    cards.forEach((c) => track.append(c));

    carousel.append(prev, track, next);
    panel.append(carousel);
    panels.append(panel);
    tabPanels.push(panel);

    const isCarouselActive = () => window.matchMedia('(min-width: 600px)').matches;
    const step = () => {
      const first = track.querySelector('.explore-range-card');
      if (!first) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const cardWidth = first.offsetWidth + gap;
      const visible = Math.max(1, Math.round((track.clientWidth + gap) / cardWidth));
      return cardWidth * visible;
    };
    const positionArrows = () => {
      const image = track.querySelector('.explore-range-card-image');
      if (!image) return;
      const carouselRect = carousel.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const centerY = imageRect.top - carouselRect.top + imageRect.height / 2;
      carousel.style.setProperty('--explore-range-arrow-top', `${centerY}px`);
    };
    let targetScroll = null;
    const applyArrowState = (scroll) => {
      positionArrows();
      if (!isCarouselActive()) {
        prev.hidden = true;
        next.hidden = true;
        return;
      }
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 1) {
        prev.hidden = true;
        next.hidden = true;
        return;
      }
      prev.hidden = scroll <= 1;
      next.hidden = scroll >= maxScroll - 1;
    };
    const updateArrows = () => applyArrowState(targetScroll ?? track.scrollLeft);
    const goBy = (delta) => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      targetScroll = Math.max(0, Math.min(maxScroll, track.scrollLeft + delta));
      applyArrowState(targetScroll);
      track.scrollTo({ left: targetScroll, behavior: 'smooth' });
    };
    prev.addEventListener('click', () => goBy(-step()));
    next.addEventListener('click', () => goBy(step()));
    track.addEventListener('scroll', () => {
      if (targetScroll !== null && Math.abs(track.scrollLeft - targetScroll) < 2) {
        targetScroll = null;
      }
      updateArrows();
    }, { passive: true });
    window.addEventListener('resize', updateArrows);
    track.querySelectorAll('img').forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', updateArrows, { once: true });
    });
    updaters.push(updateArrows);
    requestAnimationFrame(updateArrows);
  });

  const activate = (nextIndex) => {
    tabs.forEach((tab, i) => {
      const selected = i === nextIndex;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.setAttribute('tabindex', selected ? '0' : '-1');
      tabPanels[i].hidden = !selected;
    });
    tabs[nextIndex].focus();
    requestAnimationFrame(() => updaters[nextIndex]?.());
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        activate((index + 1) % tabs.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        activate((index - 1 + tabs.length) % tabs.length);
      } else if (e.key === 'Home') {
        e.preventDefault();
        activate(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        activate(tabs.length - 1);
      }
    });
  });

  block.replaceChildren(heading, tablist, panels);
}
