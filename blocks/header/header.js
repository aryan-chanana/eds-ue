import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const KIA_LOGO_SVG = '<svg class="svg-ci" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg" aria-label="Kia"><text x="50" y="30" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="900" font-size="32" fill="currentColor">KIA</text></svg>';

const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>';

const CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const LOCATION_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

function textOf(cell) {
  return (cell?.textContent || '').trim();
}

function anchorHref(cell) {
  return cell?.querySelector('a')?.getAttribute('href') || '';
}

function flattenCells(rows) {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [...rows[0].children];
  return rows.map((r) => r.firstElementChild || r);
}

// A nav-link item row is either:
//   - a row with class="nav-link" (older xwalk), or
//   - a row with 2 cells where the 2nd cell contains an anchor (block/item convention).
function isNavLinkRow(row) {
  if (row.classList.contains('nav-link')) return true;
  const cells = [...row.children];
  return cells.length === 2 && !!cells[1].querySelector('a');
}

function parseNavItem(itemBlock) {
  const rows = [...itemBlock.children];
  const linkRows = rows.filter(isNavLinkRow);
  const parentRows = rows.filter((r) => !isNavLinkRow(r));
  const cells = flattenCells(parentRows);
  const links = linkRows.map((row) => {
    const [textCell, hrefCell] = [...row.children];
    return {
      text: textOf(textCell),
      href: anchorHref(hrefCell) || '#',
    };
  });
  return {
    label: textOf(cells[0]),
    href: anchorHref(cells[1]) || '#',
    bannerPicture: cells[2]?.querySelector('picture') || cells[2]?.querySelector('img'),
    bannerLabel: textOf(cells[3]),
    links,
  };
}

function parseNavTools(toolsBlock) {
  const rows = [...toolsBlock.children];
  const cells = flattenCells(rows);
  return {
    dealerLabel: textOf(cells[0]),
    dealerHref: anchorHref(cells[1]),
  };
}

function buildDesktopItem(item) {
  const li = document.createElement('li');
  const anchor = document.createElement('a');
  anchor.href = item.href;
  anchor.textContent = item.label;
  li.append(anchor);

  if (item.links.length === 0) return li;

  li.classList.add('has-dropdown');
  const drop = document.createElement('div');
  drop.className = 'dropdown d2-box';
  const pad = document.createElement('div');
  pad.className = 'd2-pad';

  if (item.bannerPicture) {
    const banner = document.createElement('div');
    banner.className = 'd2-banner';
    const bannerA = document.createElement('a');
    bannerA.className = 'd2-a';
    bannerA.href = item.href;
    bannerA.append(item.bannerPicture);
    if (item.bannerLabel) {
      const cap = document.createElement('span');
      cap.textContent = item.bannerLabel;
      bannerA.append(cap);
    }
    banner.append(bannerA);
    pad.append(banner);
  }

  const list = document.createElement('ul');
  list.className = 'd2-list';
  item.links.forEach((link) => {
    const subLi = document.createElement('li');
    subLi.className = 'd2';
    const subA = document.createElement('a');
    subA.href = link.href;
    subA.textContent = link.text;
    subLi.append(subA);
    list.append(subLi);
  });
  pad.append(list);
  drop.append(pad);
  li.append(drop);
  return li;
}

function buildMobileItem(item) {
  const li = document.createElement('li');
  if (item.links.length === 0) {
    const a = document.createElement('a');
    a.className = 'mobile-nav-link-plain';
    a.href = item.href;
    a.textContent = item.label;
    li.append(a);
    return li;
  }
  li.className = 'has-sub';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mobile-nav-link';
  btn.innerHTML = `<span class="mobile-text">${item.label}</span><span class="chevron"></span>`;
  li.append(btn);
  const sub = document.createElement('ul');
  sub.className = 'mobile-sub';
  item.links.forEach((link) => {
    const subLi = document.createElement('li');
    const subA = document.createElement('a');
    subA.href = link.href;
    subA.textContent = link.text;
    subLi.append(subA);
    sub.append(subLi);
  });
  li.append(sub);
  return li;
}

function initBehavior(root) {
  const header = root.querySelector('#kiaHeader');
  const menuToggle = root.querySelector('#menuToggle');
  const mobileNav = root.querySelector('#mobileNav');
  const mobileOverlay = root.querySelector('#mobileOverlay');
  const mobileClose = root.querySelector('#mobileClose');
  const searchToggle = root.querySelector('#searchToggle');
  const searchPanel = root.querySelector('#searchPanel');
  const searchClose = root.querySelector('#searchClose');
  const searchInput = root.querySelector('#searchInput');

  const SCROLL_THRESHOLD = 40;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const openMobileNav = () => {
    mobileNav.classList.add('open');
    mobileOverlay.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeMobileNav = () => {
    mobileNav.classList.remove('open');
    mobileOverlay.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  menuToggle.addEventListener('click', openMobileNav);
  mobileClose.addEventListener('click', closeMobileNav);
  mobileOverlay.addEventListener('click', closeMobileNav);

  mobileNav.querySelectorAll('.mobile-nav-list .has-sub > .mobile-nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.has-sub');
      const wasOpen = parent.classList.contains('open');
      mobileNav.querySelectorAll('.has-sub.open').forEach((el) => {
        if (el !== parent) el.classList.remove('open');
      });
      parent.classList.toggle('open', !wasOpen);
    });
  });

  const openSearch = () => {
    searchPanel.classList.add('open');
    setTimeout(() => searchInput.focus(), 300);
  };
  const closeSearch = () => {
    searchPanel.classList.remove('open');
    searchInput.value = '';
  };
  searchToggle.addEventListener('click', () => {
    if (searchPanel.classList.contains('open')) closeSearch();
    else openSearch();
  });
  searchClose.addEventListener('click', closeSearch);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileNav();
      closeSearch();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1080) closeMobileNav();
  });
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  const sections = [...fragment.children];
  const navItemSections = sections.filter((s) => s.querySelector('.nav-item'));
  const leftItems = (navItemSections[0] ? [...navItemSections[0].querySelectorAll('.nav-item')] : []).map(parseNavItem);
  const rightItems = (navItemSections[1] ? [...navItemSections[1].querySelectorAll('.nav-item')] : []).map(parseNavItem);
  const toolsBlock = fragment.querySelector('.nav-tools');
  const tools = toolsBlock ? parseNavTools(toolsBlock) : null;

  // eslint-disable-next-line no-console
  console.debug('[header] parsed nav:', { leftItems, rightItems, tools });
  const firstNavItem = fragment.querySelector('.nav-item');
  if (firstNavItem) {
    // eslint-disable-next-line no-console
    console.debug('[header] first .nav-item outerHTML:', firstNavItem.outerHTML);
  }

  block.textContent = '';
  block.classList.add('kia-header-block');

  const header = document.createElement('header');
  header.id = 'kiaHeader';
  header.className = 'kia-header';

  const headerMain = document.createElement('div');
  headerMain.className = 'header-main';
  const headerInner = document.createElement('div');
  headerInner.className = 'header-inner';

  const menuToggle = document.createElement('button');
  menuToggle.id = 'menuToggle';
  menuToggle.className = 'menu-toggle';
  menuToggle.type = 'button';
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
  menuToggle.innerHTML = '<span></span><span></span><span></span>';
  headerInner.append(menuToggle);

  const primaryNav = document.createElement('nav');
  primaryNav.className = 'primary-nav';

  const leftWrap = document.createElement('div');
  leftWrap.className = 'header-left';
  const leftUl = document.createElement('ul');
  leftItems.forEach((it) => leftUl.append(buildDesktopItem(it)));
  leftWrap.append(leftUl);
  primaryNav.append(leftWrap);

  const brandDiv = document.createElement('div');
  brandDiv.className = 'ci';
  brandDiv.innerHTML = `<a class="home-link" href="/" aria-label="Kia home">${KIA_LOGO_SVG}</a>`;
  primaryNav.append(brandDiv);

  const rightWrap = document.createElement('div');
  rightWrap.className = 'header-right';
  const rightUl = document.createElement('ul');
  rightItems.forEach((it) => rightUl.append(buildDesktopItem(it)));
  rightWrap.append(rightUl);
  primaryNav.append(rightWrap);

  headerInner.append(primaryNav);

  const actions = document.createElement('div');
  actions.className = 'header-actions';
  const searchBtn = document.createElement('button');
  searchBtn.id = 'searchToggle';
  searchBtn.type = 'button';
  searchBtn.className = 'icon-btn';
  searchBtn.setAttribute('aria-label', 'Search');
  searchBtn.innerHTML = SEARCH_ICON;
  actions.append(searchBtn);
  if (tools && tools.dealerLabel) {
    const dealerA = document.createElement('a');
    dealerA.className = 'btn-dealer';
    dealerA.href = tools.dealerHref || '#';
    dealerA.innerHTML = `<span class="location-icon" aria-hidden="true">${LOCATION_ICON}</span>${tools.dealerLabel}`;
    actions.append(dealerA);
  }
  headerInner.append(actions);

  headerMain.append(headerInner);
  header.append(headerMain);

  const searchPanel = document.createElement('div');
  searchPanel.id = 'searchPanel';
  searchPanel.className = 'search-panel';
  searchPanel.innerHTML = `
    <div class="search-panel-inner">
      <input id="searchInput" type="text" placeholder="Search" aria-label="Search" />
      <button id="searchClose" type="button" class="icon-btn" aria-label="Close search">${CLOSE_ICON}</button>
    </div>
  `;
  header.append(searchPanel);

  const mobileOverlay = document.createElement('div');
  mobileOverlay.id = 'mobileOverlay';
  mobileOverlay.className = 'mobile-nav-overlay';

  const mobileNav = document.createElement('aside');
  mobileNav.id = 'mobileNav';
  mobileNav.className = 'mobile-nav';
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'mobile-nav-header';
  mobileHeader.innerHTML = `
    <div class="ci"><a class="home-link" href="/" aria-label="Kia home">${KIA_LOGO_SVG}</a></div>
    <button id="mobileClose" type="button" class="icon-btn" aria-label="Close menu">${CLOSE_ICON}</button>
  `;
  mobileNav.append(mobileHeader);
  const mobileList = document.createElement('ul');
  mobileList.className = 'mobile-nav-list';
  [...leftItems, ...rightItems].forEach((it) => mobileList.append(buildMobileItem(it)));
  mobileNav.append(mobileList);

  block.append(header, mobileOverlay, mobileNav);

  initBehavior(block);
}
