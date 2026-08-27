/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Determines the video source type from a link
 * @param {string} link - The video link URL
 * @returns {string} - 'youtube', 'vimeo', or 'video'
 */
function getVideoSource(link) {
  if (link.includes('youtube') || link.includes('youtu.be')) return 'youtube';
  if (link.includes('vimeo')) return 'vimeo';
  return 'video';
}

/**
 * Gets a human-readable video type label
 * @param {string} source - The video source type ('youtube', 'vimeo', or 'video')
 * @returns {string} - Human-readable label
 */
function getVideoTypeLabel(source) {
  const labels = {
    youtube: 'YouTube video',
    vimeo: 'Vimeo video',
    video: 'MP4 video',
  };
  return labels[source] || 'video';
}

/**
 * Create a YouTube embed wrapper element.
 * @param {URL} url - Parsed YouTube URL
 * @param {boolean} autoplay - Whether to autoplay the video
 * @param {boolean} background - Whether to embed as a background (muted, no controls)
 * @returns {HTMLElement} Wrapper div containing the YouTube iframe
 */
function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      mute: background ? '1' : '0',
      controls: background ? '0' : '1',
      disablekb: background ? '1' : '0',
      loop: background ? '1' : '0',
      playsinline: background ? '1' : '0',
    };
    suffix = `&${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }

  // Validate video ID to prevent injection via crafted URLs
  const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
  if (vid && !SAFE_ID.test(vid)) return null;
  if (!vid && !embed) return null;

  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

/**
 * Create a Vimeo embed wrapper element.
 * @param {URL} url - Parsed Vimeo URL
 * @param {boolean} autoplay - Whether to autoplay the video
 * @param {boolean} background - Whether to embed as a background (muted, no controls)
 * @returns {HTMLElement} Wrapper div containing the Vimeo iframe
 */
function embedVimeo(url, autoplay, background) {
  const [, video] = url.pathname.split('/');

  // Validate video ID to prevent injection via crafted URLs
  const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
  if (!video || !SAFE_ID.test(video)) return null;

  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      background: background ? '1' : '0',
    };
    suffix = `?${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}"
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;"
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

/**
 * Create an HTML5 video element for direct MP4/WebM playback.
 * @param {string} source - Video source URL
 * @param {boolean} autoplay - Whether to autoplay the video
 * @param {boolean} background - Whether to play as a looping background (muted, no controls)
 * @returns {HTMLVideoElement} Configured video element
 */
function getVideoElement(source, autoplay, background) {
  const video = document.createElement('video');
  video.setAttribute('controls', '');
  video.setAttribute('controlsList', 'nodownload');
  if (autoplay) video.setAttribute('autoplay', '');
  if (background) {
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.removeAttribute('controls');
    video.addEventListener('canplay', () => {
      video.muted = true;
      if (autoplay) video.play();
    });
  }

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  const ext = source.split('.').pop();
  const knownFormats = ['mp4', 'webm', 'ogg', 'mov'];
  sourceEl.setAttribute('type', `video/${knownFormats.includes(ext) ? ext : 'mp4'}`);
  video.append(sourceEl);

  return video;
}

/**
 * Load and embed a video into the block element.
 * Detects the source type (YouTube, Vimeo, or native) and appends the
 * appropriate embed. No-ops if the block has already been loaded.
 * @param {HTMLElement} block - The block element to embed into
 * @param {string} link - Video URL
 * @param {boolean} autoplay - Whether to autoplay
 * @param {boolean} background - Whether to embed as a background video
 */
function loadVideoEmbed(block, link, autoplay, background) {
  if (block.dataset.embedLoaded === 'true') return;

  const url = new URL(link);
  const source = getVideoSource(link);

  if (source === 'youtube') {
    const embedWrapper = embedYoutube(url, autoplay, background);
    if (!embedWrapper) return;
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else if (source === 'vimeo') {
    const embedWrapper = embedVimeo(url, autoplay, background);
    if (!embedWrapper) return;
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else {
    const videoEl = getVideoElement(link, autoplay, background);
    block.append(videoEl);
    videoEl.addEventListener('canplay', () => {
      block.dataset.embedLoaded = true;
    });
  }
}

/**
 * Decorate the Video block.
 * Supports YouTube, Vimeo, and native MP4/WebM videos with optional
 * poster images, autoplay, and lazy-loading via IntersectionObserver.
 * @param {HTMLElement} block - The block element to decorate
 */
export default async function decorate(block) {
  const placeholder = block.querySelector('picture');
  const anchor = block.querySelector('a');
  if (!anchor) return; // malformed block — no video link authored
  const link = anchor.href;
  block.textContent = '';
  block.dataset.embedLoaded = false;

  const autoplay = block.classList.contains('autoplay');
  const source = getVideoSource(link);

  // For native video (MP4) with a poster image, use the HTML5 poster attribute
  // instead of the custom play button overlay. This shows native controls
  // (play, fullscreen, etc.) directly on the poster image.
  if (placeholder && source === 'video') {
    const img = placeholder.querySelector('img');
    const posterSrc = img ? img.src : '';

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        const videoEl = getVideoElement(link, autoplay, autoplay);
        if (posterSrc) videoEl.setAttribute('poster', posterSrc);
        videoEl.setAttribute('preload', 'metadata');
        block.append(videoEl);
        videoEl.addEventListener('canplay', () => {
          block.dataset.embedLoaded = true;
        });
      }
    });
    observer.observe(block);
    return;
  }

  // For YouTube/Vimeo with a poster, use the custom play button overlay
  if (placeholder) {
    block.classList.add('placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-placeholder';
    wrapper.append(placeholder);

    if (!autoplay) {
      const videoType = getVideoTypeLabel(source);
      const ariaLabel = `Play ${videoType}`;

      wrapper.insertAdjacentHTML(
        'beforeend',
        `<div class="video-placeholder-play"><button type="button" title="${ariaLabel}" aria-label="${ariaLabel}"></button></div>`,
      );
      wrapper.addEventListener('click', () => {
        wrapper.remove();
        loadVideoEmbed(block, link, true, false);
      });
    }
    block.append(wrapper);
  }

  if (!placeholder || autoplay) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        const playOnLoad = autoplay && !prefersReducedMotion.matches;
        loadVideoEmbed(block, link, playOnLoad, autoplay);
      }
    });
    observer.observe(block);
  }
}
