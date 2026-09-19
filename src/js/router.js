/**
 * JEEMU CLIENT-SIDE ROUTER & VIEW CONTROLLER
 * Supports routes: #launch, #feed, #chaos, #journey, #rewards
 */

import { postsStore } from './posts-data.js';
import { analytics } from './analytics.js';

class AppRouter {
  constructor() {
    this.currentRoute = 'launch';
    this.routes = ['launch', 'feed', 'chaos', 'journey', 'rewards'];

    this._bindNavEvents();
    this._bindTeamStudioEvents();
    this._handleHashChange();

    window.addEventListener('hashchange', () => this._handleHashChange());
  }

  _bindNavEvents() {
    document.querySelectorAll('[data-route]').forEach(el => {
      el.addEventListener('click', (e) => {
        const route = el.dataset.route;
        if (route) {
          window.location.hash = '#' + route;
        }
      });
    });
  }

  _handleHashChange() {
    let hash = window.location.hash.replace(/^#\/?/, '') || 'launch';
    // Handle query params like #launch?ref=xyz
    const cleanRoute = hash.split('?')[0];

    if (this.routes.includes(cleanRoute)) {
      this.navigate(cleanRoute);
    } else {
      this.navigate('launch');
    }
  }

  navigate(route) {
    this.currentRoute = route;

    // Toggle active view containers
    this.routes.forEach(r => {
      const viewEl = document.getElementById(`view-${r}`);
      if (viewEl) {
        if (r === route) {
          viewEl.classList.remove('hidden');
        } else {
          viewEl.classList.add('hidden');
        }
      }
    });

    // Update active nav links
    document.querySelectorAll('.nav-link, .view-nav-btn').forEach(link => {
      if (link.dataset.route === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Render content for dynamic views
    if (route === 'feed') this.renderFeed();
    if (route === 'chaos') this.renderChaos();
    if (route === 'journey') this.renderJourney();

    analytics.track('route_navigate', { route });
  }

  /* ---------------- View Renderers ---------------- */
  renderFeed() {
    const list = postsStore.getFeed();
    const container = document.getElementById('feed-posts-container');
    if (!container) return;

    container.innerHTML = list.map(post => `
      <article class="feed-card" id="${post.id}">
        <div class="feed-card-header">
          <div class="feed-author-wrap">
            <div class="feed-avatar">${post.authorInitials || 'JC'}</div>
            <div>
              <h3 class="feed-author-name">${post.author}</h3>
              <span class="feed-author-role">${post.role} · ${post.date}</span>
            </div>
          </div>
          <span class="feed-category-badge">${post.category}</span>
        </div>

        <h4 class="feed-post-title">${post.title}</h4>
        <p class="feed-post-body">${post.content}</p>

        ${post.image ? `
          <div class="feed-post-media">
            <img src="${post.image}" alt="${post.title}" loading="lazy" class="feed-img">
          </div>
        ` : ''}

        <div class="feed-card-footer">
          <button class="btn-feed-like" data-feed-id="${post.id}">
            <span>❤️</span>
            <span class="like-count">${post.likes}</span>
          </button>
          <span class="feed-comment-stat">💬 ${post.comments} comments</span>
        </div>
      </article>
    `).join('');

    // Bind Like buttons
    container.querySelectorAll('.btn-feed-like').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.feedId;
        const updated = postsStore.likeFeedPost(id);
        if (updated) {
          const countEl = btn.querySelector('.like-count');
          if (countEl) countEl.textContent = updated.likes;
          btn.classList.add('liked');
        }
      });
    });
  }

  renderChaos() {
    const list = postsStore.getChaos();
    const container = document.getElementById('chaos-posts-container');
    if (!container) return;

    container.innerHTML = list.map(post => `
      <div class="chaos-card" id="${post.id}">
        <div class="chaos-tag-row">
          <span class="chaos-tag">${post.tag}</span>
          <span class="chaos-date">${post.date}</span>
        </div>
        <p class="chaos-body">${post.content}</p>
        <div class="chaos-author-line">
          <span class="chaos-author">Posted by ${post.author} (${post.role})</span>
        </div>
        <div class="chaos-reactions-row">
          <button class="btn-reaction" data-chaos-id="${post.id}" data-react="rip">
            <span>💀 RIP</span> <b class="react-val">${post.reactions.rip}</b>
          </button>
          <button class="btn-reaction" data-chaos-id="${post.id}" data-react="chaos">
            <span>🔥 Chaos</span> <b class="react-val">${post.reactions.chaos}</b>
          </button>
          <button class="btn-reaction" data-chaos-id="${post.id}" data-react="sip">
            <span>🍺 Take Sip</span> <b class="react-val">${post.reactions.sip}</b>
          </button>
        </div>
      </div>
    `).join('');

    // Bind reaction buttons
    container.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.chaosId;
        const react = btn.dataset.react;
        const updated = postsStore.reactToChaos(id, react);
        if (updated) {
          const valEl = btn.querySelector('.react-val');
          if (valEl) valEl.textContent = updated.reactions[react];
          btn.classList.add('reacted');
        }
      });
    });
  }

  renderJourney() {
    const list = postsStore.getJourney();
    const container = document.getElementById('journey-timeline-container');
    if (!container) return;

    container.innerHTML = list.map((item, index) => `
      <div class="timeline-item" id="${item.id}">
        <div class="timeline-marker">
          <div class="timeline-dot">${index + 1}</div>
          <div class="timeline-line"></div>
        </div>
        <div class="timeline-card">
          <div class="timeline-header">
            <span class="timeline-phase">${item.milestone}</span>
            <span class="timeline-badge">${item.badge}</span>
          </div>
          <h3 class="timeline-title">${item.title}</h3>
          <p class="timeline-desc">${item.description}</p>
          <div class="timeline-footer">
            <span class="timeline-meta">Date: <strong>${item.date}</strong> · Led by: <strong>${item.author}</strong></span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /* ---------------- Team Studio Authoring Modal ---------------- */
  _bindTeamStudioEvents() {
    const openBtn = document.getElementById('btn-open-team-studio');
    const modal = document.getElementById('team-studio-modal');
    const closeBtn = document.getElementById('btn-close-team-studio');
    const form = document.getElementById('team-post-form');

    openBtn?.addEventListener('click', () => {
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    // Handle publishing a new post
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const authorSelect = document.getElementById('post-author');
      const categorySelect = document.getElementById('post-target-view');
      const titleInput = document.getElementById('post-title');
      const tagInput = document.getElementById('post-tag');
      const contentInput = document.getElementById('post-content');

      const authorName = authorSelect?.value || 'Anna Vu';
      const targetView = categorySelect?.value || 'feed';
      const title = titleInput?.value.trim() || 'New Team Update';
      const tag = tagInput?.value.trim() || 'UPDATE';
      const content = contentInput?.value.trim();

      if (!content) {
        alert('Please write some content for your post.');
        return;
      }

      // Map author to role & initials
      const teamMap = {
        'Anna Vu': { role: 'Hardware & Industrial Design', initials: 'AV' },
        'Ishaan': { role: 'Embedded Firmware & NFC', initials: 'IS' },
        'Jack': { role: 'Game Systems & Content', initials: 'JK' },
        'Shefali': { role: 'Mobile App & Community', initials: 'SH' },
        'Shiva Manickam': { role: 'Platform & AI Architecture', initials: 'SM' },
        'Yana C': { role: 'Operations & Production', initials: 'YC' }
      };

      const authorData = teamMap[authorName] || { role: 'Jeemu Team', initials: 'JT' };

      if (targetView === 'feed') {
        postsStore.addFeedPost({
          author: authorName,
          role: authorData.role,
          authorInitials: authorData.initials,
          title,
          category: tag,
          content,
          image: null
        });
        this.renderFeed();
        window.location.hash = '#feed';
      } else if (targetView === 'chaos') {
        postsStore.addChaosPost({
          author: authorName,
          role: authorData.role,
          authorInitials: authorData.initials,
          tag: tag.startsWith('#') || tag.startsWith('💀') || tag.startsWith('🔥') ? tag : `🔥 ${tag.toUpperCase()}`,
          content
        });
        this.renderChaos();
        window.location.hash = '#chaos';
      } else if (targetView === 'journey') {
        postsStore.addJourneyMilestone({
          author: authorName,
          milestone: tag || 'New Milestone',
          title,
          content,
          badge: 'Team Milestone'
        });
        this.renderJourney();
        window.location.hash = '#journey';
      }

      // Reset form and close
      form.reset();
      modal.classList.add('hidden');
      alert(`🎉 Published successfully to ${targetView.toUpperCase()}!`);
    });
  }
}

export const router = new AppRouter();
