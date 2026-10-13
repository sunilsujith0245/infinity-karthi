/* =========================================================
   SETTINGS — add your video URLs here
========================================================= */
const VIDEO_URL = "https://www.youtube.com/watch?v=YOUR_VSL_VIDEO_ID";
const BOOKING_URL = "";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* 1) BOOKING LINKS */
  if (BOOKING_URL) {
    $$('a[href="#application"], #stickyCta, #bookBtn').forEach((a) => {
      a.href = BOOKING_URL;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
  }

  /* 2) SCROLL REVEAL */
  $$("[data-stagger]").forEach((parent) => {
    const type = parent.dataset.stagger || "up";
    Array.from(parent.children).forEach((child, i) => {
      child.style.setProperty("--i", Math.min(i, 6));
      if (!child.hasAttribute("data-anim")) {
        child.setAttribute("data-anim", type);
      }
    });
  });

  const items = $$("[data-anim]");
  const show = (el) => el.classList.add("in");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          show(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });

    items.forEach((el) => observer.observe(el));

    const sweep = () => {
      items.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          show(el);
        }
      });
    };

    requestAnimationFrame(sweep);
    window.addEventListener("load", sweep);
    setTimeout(sweep, 1200);

    setTimeout(() => {
      items.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.5) {
          show(el);
        }
      });
    }, 2500);
  } else {
    items.forEach(show);
  }

  /* 3) SCROLL PROGRESS + JOURNEY LINE */
  const progress = $("#progress");
  const timeline = $("#timeline");
  let ticking = false;

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;

    if (progress) {
      progress.style.transform =
        `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    }

    if (timeline) {
      const rect = timeline.getBoundingClientRect();
      const percentage = rect.height > 0
        ? (window.innerHeight * 0.68 - rect.top) / rect.height
        : 0;

      timeline.style.setProperty(
        "--p",
        Math.max(0, Math.min(1, percentage)).toFixed(3)
      );
    }

    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", onScroll);
  onScroll();

  /* 4) VIDEO HELPERS */
  function getVideoSource(rawUrl) {
    const value = (rawUrl || "").trim();
    if (!value) return null;

    // Direct MP4 / WebM / OGG video
    if (/\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(value)) {
      return { type: "file", src: value };
    }

    let url;

    try {
      url = new URL(value);
    } catch {
      return null;
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    let videoId = null;

    // YouTube watch, embed, shorts, live and youtu.be URLs
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      videoId = url.searchParams.get("v");

      if (!videoId) {
        const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
        if (match) videoId = match[1];
      }
    } else if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0];
    }

    if (videoId) {
      return {
        type: "iframe",
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&playsinline=1&rel=0`
      };
    }

    // Vimeo URLs
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = url.pathname.match(/\/(?:video\/)?(\d+)/);

      if (match) {
        return {
          type: "iframe",
          src: `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&playsinline=1`
        };
      }
    }

    return null;
  }

  function mountVideo(frame, rawUrl, title) {
    if (!frame) return;

    const source = getVideoSource(rawUrl);
    frame.innerHTML = "";

    if (!source) {
      frame.setAttribute("data-video-error", "missing-or-invalid-url");
      console.warn(`${title}: Add a valid video URL.`);
      return;
    }

    frame.removeAttribute("data-video-error");

    if (source.type === "file") {
      const video = document.createElement("video");

      video.src = source.src;
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-label", title);

      frame.appendChild(video);

      const playPromise = video.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // Browser may require the viewer to press Play.
        });
      }

      return;
    }

    const iframe = document.createElement("iframe");

    iframe.src = source.src;
    iframe.title = title;
    iframe.loading = "eager";
    iframe.allow =
      "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    frame.appendChild(iframe);
  }

  /* VSL — direct player, no custom thumbnail */
  const vslFrame = $("#vslFrame");

  if (vslFrame) {
    const vslUrl = VIDEO_URL || vslFrame.dataset.videoUrl || "";
    mountVideo(vslFrame, vslUrl, "Strategy video");
  }

  /* 5) TESTIMONIAL CAROUSEL */
  const viewport = $("#cViewport");
  const track = $("#cTrack");
  const prev = $(".c-arrow.prev");
  const next = $(".c-arrow.next");
  const dotsWrap = $("#cDots");

  if (viewport && track && dotsWrap) {
    const cards = $$(".t-card", track);
    let index = 0;
    let timer = null;
    let startX = 0;
    let deltaX = 0;

    const perView = () =>
      window.innerWidth <= 680 ? 1 :
      window.innerWidth <= 980 ? 2 : 3;

    const maxIndex = () => Math.max(0, cards.length - perView());

    function render(animate) {
      if (!cards.length) return;

      index = Math.max(0, Math.min(index, maxIndex()));

      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap) || 0;
      const width = cards[0].getBoundingClientRect().width;

      track.style.transition = animate
        ? "transform .6s cubic-bezier(.22,1,.36,1)"
        : "none";

      track.style.transform =
        `translate3d(${-index * (width + gap)}px,0,0)`;

      $$(".c-dot", dotsWrap).forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
      });

      const display = cards.length > perView() ? "grid" : "none";

      if (prev) prev.style.display = display;
      if (next) next.style.display = display;
    }

    function buildDots() {
      dotsWrap.innerHTML = "";

      const count = maxIndex() + 1;
      if (count <= 1) return;

      for (let i = 0; i < count; i++) {
        const dot = document.createElement("button");

        dot.type = "button";
        dot.className = "c-dot";
        dot.setAttribute("aria-label", `Show testimonial ${i + 1}`);

        dot.addEventListener("click", () => {
          stop();
          index = i;
          render(true);
          start();
        });

        dotsWrap.appendChild(dot);
      }
    }

    const goNext = () => {
      index = index >= maxIndex() ? 0 : index + 1;
      render(true);
    };

    const goPrev = () => {
      index = index <= 0 ? maxIndex() : index - 1;
      render(true);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      stop();

      if (cards.length > perView()) {
        timer = setInterval(goNext, 5500);
      }
    };

    if (next) {
      next.addEventListener("click", () => {
        stop();
        goNext();
        start();
      });
    }

    if (prev) {
      prev.addEventListener("click", () => {
        stop();
        goPrev();
        start();
      });
    }

    viewport.addEventListener("mouseenter", stop);
    viewport.addEventListener("mouseleave", start);

    viewport.addEventListener("touchstart", (event) => {
      startX = event.touches[0].clientX;
      deltaX = 0;
      stop();
    }, { passive: true });

    viewport.addEventListener("touchmove", (event) => {
      deltaX = event.touches[0].clientX - startX;
    }, { passive: true });

    viewport.addEventListener("touchend", () => {
      if (Math.abs(deltaX) > 45) {
        (deltaX < 0 ? goNext : goPrev)();
      }

      start();
    });

    let resizeTimer;

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        buildDots();
        render(false);
        start();
      }, 120);
    });

    buildDots();
    render(false);
    start();
  }

  /* 6) FAQ ACCORDION */
  const faqs = $$(".faq");

  faqs.forEach((item) => {
    const button = $("button", item);
    if (!button) return;

    button.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");

      faqs.forEach((faq) => faq.classList.remove("open"));

      if (!wasOpen) item.classList.add("open");
    });
  });

  /* 7) STICKY MOBILE CTA */
  const sticky = $("#stickyCta");
  const hero = $("#hero");
  const application = $("#application");
  const finalSection = $("#final");

  if (sticky && hero && "IntersectionObserver" in window) {
    const state = { hero: true, app: false, final: false };

    const update = () => {
      sticky.classList.toggle(
        "show",
        !state.hero && !state.app && !state.final
      );
    };

    const watch = (element, key) => {
      if (!element) return;

      new IntersectionObserver(([entry]) => {
        state[key] = entry.isIntersecting;
        update();
      }, { threshold: 0.08 }).observe(element);
    };

    watch(hero, "hero");
    watch(application, "app");
    watch(finalSection, "final");
  }

  /* 8) YEAR */
  const year = $("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }
});