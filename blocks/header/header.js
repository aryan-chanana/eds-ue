import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

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

function pictureOrImg(cell) {
  return cell?.querySelector('picture') || cell?.querySelector('img') || null;
}

function parseNavItem(itemBlock) {
  const rows = [...itemBlock.children];
  if (rows.length === 0) {
    return {
      label: '', href: '#', bannerPicture: null, bannerLabel: '', links: [],
    };
  }
  const row0Cells = [...(rows[0]?.children || [])];
  let parentCells;
  let linkStartIdx;
  if (row0Cells.length >= 3) {
    // Structure A: parent's fields are cells in row 0
    parentCells = row0Cells;
    linkStartIdx = 1;
  } else {
    // Structure B: each parent field is its own row (4 fields → 4 rows)
    parentCells = rows.slice(0, 4).map((r) => r.firstElementChild || r);
    linkStartIdx = 4;
  }
  const linkRows = rows.slice(linkStartIdx);
  const links = linkRows.map((row) => {
    const c = [...row.children];
    return {
      text: textOf(c[0]),
      href: anchorHref(c[1]),
      picture: pictureOrImg(c[2]),
      role: textOf(c[3]).toLowerCase(),
    };
  });
  return {
    label: textOf(parentCells[0]),
    href: anchorHref(parentCells[1]) || '#',
    bannerPicture: pictureOrImg(parentCells[2]),
    bannerLabel: textOf(parentCells[3]),
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

function isHeadingRole(role) {
  return role === 'heading' || role === 'break-heading';
}

function isBreakRole(role) {
  return role === 'break' || role === 'break-heading';
}

function groupLinksIntoColumns(links) {
  const columns = [[]];
  links.forEach((link, idx) => {
    if (idx > 0 && isBreakRole(link.role)) columns.push([]);
    columns[columns.length - 1].push(link);
  });
  return columns;
}

function buildDesktopItem(navItem) {
  const li = document.createElement('li');
  const anchor = document.createElement('a');
  anchor.href = navItem.href;
  anchor.textContent = navItem.label;
  li.append(anchor);

  if (navItem.links.length === 0) return li;

  li.classList.add('has-dropdown');
  const drop = document.createElement('div');
  drop.className = 'dropdown d2-box';
  const pad = document.createElement('div');
  pad.className = 'd2-pad';

  const linkImage = navItem.links.find((l) => l.picture)?.picture;
  const hasBannerArea = !!navItem.bannerPicture || !!linkImage;
  let bannerA = null;
  let defaultBannerNode = null;

  if (hasBannerArea) {
    const banner = document.createElement('div');
    banner.className = 'd2-banner';
    bannerA = document.createElement('a');
    bannerA.className = 'd2-a';
    bannerA.href = navItem.href;
    defaultBannerNode = navItem.bannerPicture || linkImage;
    if (defaultBannerNode) bannerA.append(defaultBannerNode.cloneNode(true));
    if (navItem.bannerLabel) {
      const cap = document.createElement('span');
      cap.textContent = navItem.bannerLabel;
      bannerA.append(cap);
    }
    banner.append(bannerA);
    pad.append(banner);
  }

  const swapBanner = (picture) => {
    if (!bannerA || !picture) return;
    bannerA.querySelectorAll('picture, img').forEach((el) => el.remove());
    bannerA.prepend(picture.cloneNode(true));
  };
  const restoreBanner = () => {
    if (bannerA && defaultBannerNode) swapBanner(defaultBannerNode);
  };

  const list = document.createElement('div');
  list.className = 'd2-list';
  if (!hasBannerArea) list.classList.add('d2-list-full');

  const columns = groupLinksIntoColumns(navItem.links);
  columns.forEach((colLinks) => {
    const ul = document.createElement('ul');
    ul.className = 'd2-column';
    colLinks.forEach((link) => {
      const row = document.createElement('li');
      if (isHeadingRole(link.role)) {
        row.className = 'd2-heading';
        row.textContent = link.text;
      } else {
        row.className = 'd2';
        const a = document.createElement('a');
        a.href = link.href || '#';
        a.textContent = link.text;
        a.style.color = '#333';
        if (link.picture) {
          a.addEventListener('mouseenter', () => swapBanner(link.picture));
        }
        row.append(a);
      }
      ul.append(row);
    });
    list.append(ul);
  });
  pad.append(list);

  if (bannerA) drop.addEventListener('mouseleave', restoreBanner);

  drop.append(pad);
  li.append(drop);
  return li;
}

function buildMobileItem(navItem) {
  const li = document.createElement('li');
  if (navItem.links.length === 0) {
    const a = document.createElement('a');
    a.className = 'mobile-nav-link-plain';
    a.href = navItem.href;
    a.textContent = navItem.label;
    li.append(a);
    return li;
  }
  li.className = 'has-sub';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mobile-nav-link';
  btn.innerHTML = `<span class="mobile-text">${navItem.label}</span><span class="chevron"></span>`;
  li.append(btn);
  const sub = document.createElement('ul');
  sub.className = 'mobile-sub';
  navItem.links.forEach((link) => {
    const subLi = document.createElement('li');
    if (isHeadingRole(link.role)) {
      subLi.className = 'mobile-sub-heading';
      subLi.textContent = link.text;
    } else {
      const subA = document.createElement('a');
      subA.href = link.href || '#';
      subA.textContent = link.text;
      subLi.append(subA);
    }
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileNav();
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

  const allNavItems = [...fragment.querySelectorAll('.nav-item')].map(parseNavItem);
  const leftItems = allNavItems.slice(0, 4);
  const rightItems = allNavItems.slice(4);
  const toolsBlock = fragment.querySelector('.nav-tools');
  const tools = toolsBlock ? parseNavTools(toolsBlock) : null;

  const summarize = (items) => items.map((it) => ({
    label: it.label,
    hasBanner: !!it.bannerPicture,
    bannerLabel: it.bannerLabel,
    linkCount: it.links.length,
    linksWithImage: it.links.filter((l) => l.picture).length,
    linkRoles: it.links.map((l) => l.role || 'link'),
  }));
  // eslint-disable-next-line no-console
  console.debug('[header] parsed nav:', {
    left: summarize(leftItems), right: summarize(rightItems), tools,
  });
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

  const rightWrap = document.createElement('div');
  rightWrap.className = 'header-right';
  const rightUl = document.createElement('ul');
  rightItems.forEach((it) => rightUl.append(buildDesktopItem(it)));
  rightWrap.append(rightUl);
  primaryNav.append(rightWrap);

  headerInner.append(primaryNav);

  if (tools && tools.dealerLabel) {
    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const dealerA = document.createElement('a');
    dealerA.className = 'btn-dealer';
    dealerA.href = tools.dealerHref || '#';
    dealerA.innerHTML = `<span class="location-icon" aria-hidden="true">${LOCATION_ICON}</span>${tools.dealerLabel}`;
    actions.append(dealerA);
    headerInner.append(actions);
  }

  headerMain.append(headerInner);
  header.append(headerMain);

  const mobileOverlay = document.createElement('div');
  mobileOverlay.id = 'mobileOverlay';
  mobileOverlay.className = 'mobile-nav-overlay';

  const mobileNav = document.createElement('aside');
  mobileNav.id = 'mobileNav';
  mobileNav.className = 'mobile-nav';
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'mobile-nav-header';
  mobileHeader.innerHTML = `
        <span class="logo">
                <svg data-name="Kia" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 34" width="68" height="34" class="svg-ci">

          <path d="M39.4,23.11c0,0.12,0.04,0.2,0.11,0.2c0.05,0,0.1-0.02,0.16-0.06L60.65,9.62c0.37-0.24,0.71-0.37,1.21-0.37
h4.61c0.71,0,1.18,0.47,1.18,1.18v8.8c0,1.06-0.24,1.68-1.18,2.25l-5.59,3.36c-0.07,0.05-0.13,0.07-0.19,0.07
c-0.07,0-0.13-0.05-0.13-0.24l0-10.28c0-0.11-0.04-0.2-0.11-0.2c-0.05,0-0.1,0.02-0.16,0.06l-15.34,9.96
c-0.43,0.28-0.78,0.36-1.18,0.36H33.61c-0.71,0-1.18-0.47-1.18-1.18V10.71c0-0.09-0.04-0.18-0.11-0.18c-0.05,0-0.1,0.02-0.16,0.06
l-10.11,6.08c-0.1,0.06-0.13,0.11-0.13,0.16c0,0.04,0.02,0.08,0.09,0.16l7.22,7.22c0.1,0.1,0.16,0.17,0.16,0.25
c0,0.09-0.11,0.12-0.23,0.12l-6.54,0c-0.51,0-0.91-0.08-1.18-0.35l-4.38-4.38c-0.04-0.04-0.08-0.07-0.13-0.07
c-0.04,0-0.09,0.02-0.14,0.05l-7.33,4.4c-0.44,0.27-0.75,0.35-1.18,0.35H1.53c-0.71,0-1.18-0.47-1.18-1.18v-8.64
c0-1.06,0.24-1.67,1.18-2.24l5.63-3.38C7.21,9.1,7.26,9.09,7.31,9.09c0.09,0,0.13,0.09,0.13,0.28v11.55c0,0.12,0.03,0.18,0.11,0.18
c0.05,0,0.1-0.03,0.17-0.07L26.73,9.61c0.45-0.27,0.73-0.35,1.25-0.35h10.23c0.71,0,1.18,0.47,1.18,1.18V23.11z"></path>
        </svg>
      </span>
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
