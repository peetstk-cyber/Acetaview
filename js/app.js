/**
 * AcetaView — Exact Dynamic Frame Engine
 * Explicitly sets 3D Vertical Tilt default to 108 frames matching Case 01 data.
 */

// 1. CASES DATA
window.CASES_DATA = [
  { id: "case-01", caseNumber: 1, title: "Case 01", folder: "Case01", slices: { axial: 140, sagittal: 108, coronal: 110 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-02", caseNumber: 2, title: "Case 02", folder: "Case02", slices: { axial: 140, sagittal: 115, coronal: 125 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-03", caseNumber: 3, title: "Case 03", folder: "Case03", slices: { axial: 110, sagittal: 95, coronal: 105 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-04", caseNumber: 4, title: "Case 04", folder: "Case04", slices: { axial: 105, sagittal: 90, coronal: 100 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-05", caseNumber: 5, title: "Case 05", folder: "Case05", slices: { axial: 130, sagittal: 110, coronal: 120 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-06", caseNumber: 6, title: "Case 06", folder: "Case06", slices: { axial: 125, sagittal: 105, coronal: 115 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-07", caseNumber: 7, title: "Case 07", folder: "Case07", slices: { axial: 135, sagittal: 112, coronal: 122 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-08", caseNumber: 8, title: "Case 08", folder: "Case08", slices: { axial: 118, sagittal: 98, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-09", caseNumber: 9, title: "Case 09", folder: "Case09", slices: { axial: 115, sagittal: 95, coronal: 105 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-10", caseNumber: 10, title: "Case 10", folder: "Case10", slices: { axial: 145, sagittal: 120, coronal: 130 }, views3d: { horizontal: 92, vertical: 108 } }
];

function getCandidateUrls(folderName, plane, i) {
  const s3 = String(i).padStart(3, '0');
  const s2 = String(i).padStart(2, '0');
  const s1 = String(i);

  return [
    `./videos/${folderName}/${plane}/ezgif-frame-${s3}.jpg`,
    `./videos/${folderName}/${plane}/ezgif-frame-${s2}.jpg`,
    `./videos/${folderName}/${plane}/ezgif-frame-${s1}.jpg`,
    `./videos/${folderName}/${plane}/ezgif-frame-${s3}.webp`,
    `./videos/${folderName}/${plane}/ezgif-frame-${s2}.webp`,
    `./videos/${folderName}/${plane}/ezgif-frame-${s3}.png`,
    `./videos/${folderName}/${plane}/ezgif-frame-${s2}.png`,
    `./videos/${folderName}/${plane}/${s3}.jpg`,
    `./videos/${folderName}/${plane}/${s2}.jpg`,
    `./videos/${folderName}/${plane}/${s3}.webp`,
    `./videos/${folderName}/${plane}/${s2}.webp`
  ];
}

// 2. UNIVERSAL IMAGE SEQUENCE ENGINE WITH EXACT FRAME DETECTION
class ImageSequenceManager {
  constructor() {
    this.cache = {};
    this.available = {};
    this.detectedCounts = {};
  }

  clearCache() {
    Object.keys(this.cache).forEach(key => {
      if (Array.isArray(this.cache[key])) {
        this.cache[key].forEach(img => {
          if (img) {
            img.onload = null;
            img.onerror = null;
            img.src = '';
          }
        });
      }
    });

    this.cache = {};
    this.available = {};
    this.detectedCounts = {};
  }

  preloadCase(folderName, slicesObj) {
    this.clearCache();
    // FIX 3: Increment generation counter so stale scanNextBatch callbacks self-cancel
    this.generation = (this.generation || 0) + 1;
    const myGen = this.generation;

    const planes = ['axial', 'sagittal', 'coronal', '3d_horizontal', '3d_vertical'];
    
    planes.forEach(plane => {
      const key = `${folderName}_${plane}`;
      this.cache[key] = [];
      
      const defaultCount = (plane === '3d_horizontal') ? 92 : (plane === '3d_vertical') ? 108 : (slicesObj[plane] || 108);
      this.detectedCounts[key] = defaultCount;

      // PHASE 1: Load only first 20 frames immediately on case open
      // Avoids firing 360 simultaneous requests and triggering Vercel rate limiting
      for (let i = 1; i <= 20; i++) {
        this.loadSingleFrame(folderName, plane, i);
      }

      // PHASE 2: Background key-frame scan in small batches every 200ms
      // Discovers actual frame count without spamming the CDN
      // maxScan is capped per plane type — 3D horizontal has 92 frames, 3D vertical has 108 frames
      const batchSize = 5;
      const maxScan = (plane === '3d_horizontal') ? 110   // 92 frames + small buffer
                    : (plane === '3d_vertical')   ? 120   // 108 frames + small buffer
                    : 200;                                 // 2D planes: real data max ~145
      let batchStart = 21;
      let consecutiveMiss = 0; // Early-stop: track consecutive frames with no valid image

      const scanNextBatch = () => {
        // Stop if case changed
        if (myGen !== this.generation) return;

        const batchEnd = Math.min(batchStart + batchSize - 1, maxScan);
        for (let i = batchStart; i <= batchEnd; i++) {
          const img = this.loadSingleFrame(folderName, plane, i);

          // Early-stop: monitor each frame's outcome after a short delay
          // If the frame slot becomes null (all candidates failed) = miss
          const frameIdx = i;
          setTimeout(() => {
            if (myGen !== this.generation) return;
            const slot = this.cache[key] ? this.cache[key][frameIdx - 1] : undefined;
            if (slot === null) {
              consecutiveMiss++;
            } else if (slot && slot.complete && slot.naturalWidth > 0) {
              consecutiveMiss = 0; // reset on any successful frame
            }
          }, 2000); // wait 2s for slow connections before judging a frame as miss
        }

        batchStart += batchSize;

        // Stop scanning if: reached maxScan OR 3 consecutive misses detected
        if (batchStart <= maxScan && consecutiveMiss < 3) {
          setTimeout(scanNextBatch, 200);
        }
      };

      // Start background scan after 500ms delay (after user sees initial frames)
      setTimeout(scanNextBatch, 500);
    });
  }

  loadSingleFrame(folderName, plane, index) {
    if (index < 1) return null;

    const key = `${folderName}_${plane}`;
    if (!this.cache[key]) this.cache[key] = [];
    
    if (this.cache[key][index - 1] !== undefined) {
      return this.cache[key][index - 1];
    }

    const candidates = getCandidateUrls(folderName, plane, index);
    const img = new Image();
    let candidateIdx = 0;

    const tryNext = () => {
      if (candidateIdx < candidates.length) {
        img.src = candidates[candidateIdx++];
      } else {
        this.cache[key][index - 1] = null;
      }
    };

    img.onload = () => {
      this.available[key] = true;
      const curMax = this.detectedCounts[key] || 0;
      if (index > curMax) {
        this.detectedCounts[key] = index;
        if (plane === 'axial' || plane === 'sagittal' || plane === 'coronal') {
          window.updateSliderLimits(plane, index);
        }
      }

      // Debounce via rAF: cancel any pending frame before scheduling a new one
      // Prevents 25+ redundant canvas redraws per 200ms batch during background loading
      if (plane === 'axial' || plane === 'sagittal' || plane === 'coronal') {
        cancelAnimationFrame(window._raf2D);
        window._raf2D = requestAnimationFrame(() => window.renderAll2D());
      } else {
        cancelAnimationFrame(window._raf3D);
        window._raf3D = requestAnimationFrame(() => window.render3D());
      }
    };

    img.onerror = () => {
      tryNext();
    };

    tryNext();
    this.cache[key][index - 1] = img;
    return img;
  }

  drawFrame(ctx, folderName, plane, index, cW, cH) {
    const key = `${folderName}_${plane}`;
    const maxCount = this.detectedCounts[key] || ((plane === '3d_vertical') ? 108 : (plane === '3d_horizontal') ? 92 : 100);

    const safeIndex = Math.max(1, Math.min(maxCount, ((index - 1 + maxCount) % maxCount) + 1));
    
    let img = this.cache[key] ? this.cache[key][safeIndex - 1] : null;
    if (!img) {
      img = this.loadSingleFrame(folderName, plane, safeIndex);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      const vW = img.naturalWidth;
      const vH = img.naturalHeight;

      const scale = Math.min(cW / vW, cH / vH);
      const drawW = vW * scale;
      const drawH = vH * scale;
      const drawX = (cW - drawW) / 2;
      const drawY = (cH - drawH) / 2;

      ctx.fillStyle = '#05070c';
      ctx.fillRect(0, 0, cW, cH);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      if (maxCount > 1) {
        for (let k = -10; k <= 10; k++) {
          if (k === 0) continue;
          const targetIdx = ((safeIndex - 1 + k + maxCount) % maxCount + maxCount) % maxCount + 1;
          this.loadSingleFrame(folderName, plane, targetIdx);
        }
      }

      return true;
    }

    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, cW, cH);
    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading...', cW / 2, cH / 2);

    return true;
  }
}

window.imageSequenceManager = new ImageSequenceManager();



// 3. TOUCH CONTROLLER ENGINE
class TouchController {
  static bindScrub(canvas, onStepChange) {
    if (!canvas) return () => {};
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let isDragging = false;
    let isHorizontalGesture = null;

    const onStart = (e) => {
      isDragging = true;
      isHorizontalGesture = null;
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
    };

    const onMove = (e) => {
      if (!isDragging) return;

      const touch = e.touches ? e.touches[0] : e;
      const curX = touch.clientX;
      const curY = touch.clientY;
      const diffX = curX - startX;
      const diffY = curY - startY;

      // Smart Gesture Locking: detect direction on first 5px of movement
      if (isHorizontalGesture === null) {
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);
        if (absX < 5 && absY < 5) return;

        if (absY > absX) {
          isHorizontalGesture = false; // Vertical swipe -> allow native page scrolling
          return;
        } else {
          isHorizontalGesture = true;  // Horizontal swipe -> lock gesture to CT slice scrubbing
        }
      }

      // If user is scrolling the page vertically, do not interfere
      if (isHorizontalGesture === false) return;

      // Horizontal swipe: scrub CT slices and prevent page horizontal panning
      if (e.cancelable) e.preventDefault();

      // Dynamic sensitivity: in Fullscreen mode use 12px/step for fine precision control (prevents fast jumping)
      const box = canvas.closest('.viewport-box');
      const isFullscreen = box ? box.classList.contains('fullscreen') : false;
      const pxPerStep = isFullscreen ? 12 : 6;

      const d = lastX - curX;
      if (Math.abs(d) >= pxPerStep) {
        const steps = Math.trunc(d / pxPerStep);
        if (steps !== 0) {
          onStepChange(steps);
          lastX = curX;
        }
      }
    };

    const onEnd = () => {
      isDragging = false;
      isHorizontalGesture = null;
    };

    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: true });
    canvas.addEventListener('touchcancel', onEnd, { passive: true });

    canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    // Returns a dispose function to cleanly remove all listeners if needed
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('touchcancel', onEnd);
      canvas.removeEventListener('mousedown', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
    };
  }
}

// 4. MAIN WORKSPACE APP STATE
let currentCaseObj = window.CASES_DATA[0];
let slicesState = { axial: 1, sagittal: 1, coronal: 1 };
let rot3DState = { horiz: 0, vert: 0 };

// rAF handles — ensures canvas redraws sync with browser repaint cycle (60fps on iPad)
window._raf2D = null;
window._raf3D = null;

// Helper to update YouTube-style progress fill on slim range sliders
window.updateSliderProgress = function(sliderId) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  slider.style.setProperty('--progress', `${pct.toFixed(2)}%`);
};

window.updateSliderLimits = function(plane, maxCount) {
  let slider = null;
  if (plane === 'axial') slider = document.getElementById('sliderAxial');
  if (plane === 'sagittal') slider = document.getElementById('sliderSagittal');
  if (plane === 'coronal') slider = document.getElementById('sliderCoronal');

  if (slider && maxCount > 0) {
    slider.max = maxCount;
    if (slicesState[plane] > maxCount) slicesState[plane] = maxCount;
  }
  // Debounce: slider limit updates can fire rapidly during batch load — coalesce into 1 render
  clearTimeout(window._sliderDebounce);
  window._sliderDebounce = setTimeout(() => window.renderAll2D(), 16);
};

// Global Navigation Functions
window.openCase = function(caseId) {
  const found = window.CASES_DATA.find(c => c.id === caseId);
  if (found) currentCaseObj = found;

  window.imageSequenceManager.preloadCase(currentCaseObj.folder, currentCaseObj.slices);

  // Close any active fullscreen mode when changing cases
  document.querySelectorAll('.viewport-box.fullscreen').forEach(box => {
    box.classList.remove('fullscreen');
    const icon = box.querySelector('.btn-fullscreen i');
    if (icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
  });
  document.body.classList.remove('has-fullscreen');

  const homeView = document.getElementById('homeView');
  const caseView = document.getElementById('caseView');

  if (homeView) homeView.style.display = 'none';
  if (caseView) caseView.style.display = 'block';

  const dropdown = document.getElementById('caseSelectDropdown');
  if (dropdown) dropdown.value = currentCaseObj.id;

  const currentIdx = window.CASES_DATA.findIndex(c => c.id === currentCaseObj.id);
  const btnPrev = document.getElementById('btnPrevCase');
  const btnNext = document.getElementById('btnNextCase');
  if (btnPrev) btnPrev.disabled = (currentIdx <= 0);
  if (btnNext) btnNext.disabled = (currentIdx >= window.CASES_DATA.length - 1);

  slicesState.axial = 1;
  slicesState.sagittal = 1;
  slicesState.coronal = 1;

  const sliderAxial = document.getElementById('sliderAxial');
  const sliderSagittal = document.getElementById('sliderSagittal');
  const sliderCoronal = document.getElementById('sliderCoronal');

  if (sliderAxial) { sliderAxial.max = currentCaseObj.slices.axial; sliderAxial.value = 1; }
  if (sliderSagittal) { sliderSagittal.max = currentCaseObj.slices.sagittal; sliderSagittal.value = 1; }
  if (sliderCoronal) { sliderCoronal.max = currentCaseObj.slices.coronal; sliderCoronal.value = 1; }

  rot3DState.horiz = 0;
  rot3DState.vert = 0;

  const slider3DH = document.getElementById('slider3DHoriz');
  const slider3DV = document.getElementById('slider3DVert');
  if (slider3DH) slider3DH.value = 0;
  if (slider3DV) slider3DV.value = 0;

  window.switchMode('2d');
};

window.prevCase = function() {
  const currentIndex = window.CASES_DATA.findIndex(c => c.id === currentCaseObj.id);
  if (currentIndex > 0) {
    window.openCase(window.CASES_DATA[currentIndex - 1].id);
  }
};

window.nextCase = function() {
  const currentIndex = window.CASES_DATA.findIndex(c => c.id === currentCaseObj.id);
  if (currentIndex >= 0 && currentIndex < window.CASES_DATA.length - 1) {
    window.openCase(window.CASES_DATA[currentIndex + 1].id);
  }
};

window.showHome = function() {
  const homeView = document.getElementById('homeView');
  const caseView = document.getElementById('caseView');

  if (caseView) caseView.style.display = 'none';
  if (homeView) homeView.style.display = 'block';
};

window.switchMode = function(mode) {
  const btn2D = document.getElementById('btnMode2D');
  const btn3D = document.getElementById('btnMode3D');
  const layout2D = document.getElementById('layout2D');
  const layout3D = document.getElementById('layout3D');

  if (mode === '2d') {
    if (btn2D) btn2D.classList.add('active');
    if (btn3D) btn3D.classList.remove('active');
    if (layout2D) layout2D.style.display = 'grid';
    if (layout3D) layout3D.style.display = 'none';

    window.renderAll2D();
  } else {
    if (btn3D) btn3D.classList.add('active');
    if (btn2D) btn2D.classList.remove('active');
    if (layout2D) layout2D.style.display = 'none';
    if (layout3D) layout3D.style.display = 'block';

    window.render3D();
  }
};

window.toggleFullscreen = function(btn) {
  const box = btn.closest('.viewport-box');
  if (!box) return;

  const isFullscreen = box.classList.toggle('fullscreen');
  document.body.classList.toggle('has-fullscreen', document.querySelectorAll('.viewport-box.fullscreen').length > 0);

  const icon = btn.querySelector('i');

  if (isFullscreen) {
    if (icon) {
      icon.classList.remove('fa-expand');
      icon.classList.add('fa-compress');
    }
  } else {
    if (icon) {
      icon.classList.remove('fa-compress');
      icon.classList.add('fa-expand');
    }
  }

  window.renderAll2D();
  window.render3D();
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.viewport-box.fullscreen').forEach(box => {
      box.classList.remove('fullscreen');
      const icon = box.querySelector('.btn-fullscreen i');
      if (icon) {
        icon.classList.remove('fa-compress');
        icon.classList.add('fa-expand');
      }
    });
    document.body.classList.remove('has-fullscreen');
    window.renderAll2D();
    window.render3D();
  }
});

window.renderAll2D = function() {
  cancelAnimationFrame(window._raf2D);
  window._raf2D = requestAnimationFrame(() => {
    const canvasAxial = document.getElementById('canvasAxial');
    const canvasSagittal = document.getElementById('canvasSagittal');
    const canvasCoronal = document.getElementById('canvasCoronal');

    window.resizeCanvas(canvasAxial);
    window.resizeCanvas(canvasSagittal);
    window.resizeCanvas(canvasCoronal);

    const ctxAxial = canvasAxial.getContext('2d');
    const ctxSag = canvasSagittal.getContext('2d');
    const ctxCor = canvasCoronal.getContext('2d');

    window.imageSequenceManager.drawFrame(ctxAxial, currentCaseObj.folder, 'axial', slicesState.axial, canvasAxial.width, canvasAxial.height);
    window.imageSequenceManager.drawFrame(ctxSag, currentCaseObj.folder, 'sagittal', slicesState.sagittal, canvasSagittal.width, canvasSagittal.height);
    window.imageSequenceManager.drawFrame(ctxCor, currentCaseObj.folder, 'coronal', slicesState.coronal, canvasCoronal.width, canvasCoronal.height);

    const countAxial = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_axial`] || currentCaseObj.slices.axial;
    const countSag = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_sagittal`] || currentCaseObj.slices.sagittal;
    const countCor = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_coronal`] || currentCaseObj.slices.coronal;

    document.getElementById('badgeAxial').textContent = `${slicesState.axial}/${countAxial}`;
    document.getElementById('badgeSagittal').textContent = `${slicesState.sagittal}/${countSag}`;
    document.getElementById('badgeCoronal').textContent = `${slicesState.coronal}/${countCor}`;

    window.updateSliderProgress('sliderAxial');
    window.updateSliderProgress('sliderSagittal');
    window.updateSliderProgress('sliderCoronal');
  });
};

window.render3D = function() {
  cancelAnimationFrame(window._raf3D);
  window._raf3D = requestAnimationFrame(() => {
    const canvasH = document.getElementById('canvas3DHoriz');
    const canvasV = document.getElementById('canvas3DVert');

    window.resizeCanvas(canvasH);
    window.resizeCanvas(canvasV);

    const countH = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_3d_horizontal`] || (currentCaseObj.views3d ? currentCaseObj.views3d.horizontal : 92);
    const ratioH = Math.max(0, Math.min(0.9999, (rot3DState.horiz % 360) / 360));
    const frameH = Math.floor(ratioH * countH) + 1;

    const countV = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_3d_vertical`] || (currentCaseObj.views3d ? currentCaseObj.views3d.vertical : 108);
    const ratioV = Math.max(0, Math.min(0.9999, (rot3DState.vert % 360) / 360));
    const frameV = Math.floor(ratioV * countV) + 1;

    const ctxH = canvasH.getContext('2d');
    const ctxV = canvasV.getContext('2d');

    window.imageSequenceManager.drawFrame(ctxH, currentCaseObj.folder, '3d_horizontal', frameH, canvasH.width, canvasH.height);
    window.imageSequenceManager.drawFrame(ctxV, currentCaseObj.folder, '3d_vertical', frameV, canvasV.width, canvasV.height);

    window.updateSliderProgress('slider3DHoriz');
    window.updateSliderProgress('slider3DVert');
  });
};
window.resizeCanvas = function(canvas) {
  if (!canvas || !canvas.parentElement) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const targetW = rect.width > 0 ? Math.floor(rect.width * (window.devicePixelRatio || 1)) : 400;
  const targetH = rect.height > 0 ? Math.floor(rect.height * (window.devicePixelRatio || 1)) : 400;

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
};

// Setup Event Listeners after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.getElementById('caseSelectDropdown');
  if (dropdown) dropdown.addEventListener('change', (e) => window.openCase(e.target.value));

  const btnPrev = document.getElementById('btnPrevCase');
  const btnNext = document.getElementById('btnNextCase');
  if (btnPrev) btnPrev.addEventListener('click', () => window.prevCase());
  if (btnNext) btnNext.addEventListener('click', () => window.nextCase());

  const btnHome = document.getElementById('btnBackHome');
  if (btnHome) btnHome.addEventListener('click', () => window.showHome());

  const btn2D = document.getElementById('btnMode2D');
  const btn3D = document.getElementById('btnMode3D');
  if (btn2D) btn2D.addEventListener('click', () => window.switchMode('2d'));
  if (btn3D) btn3D.addEventListener('click', () => window.switchMode('3d'));

  // Sliders
  const sliderAxial = document.getElementById('sliderAxial');
  const sliderSagittal = document.getElementById('sliderSagittal');
  const sliderCoronal = document.getElementById('sliderCoronal');
  const slider3DH = document.getElementById('slider3DHoriz');
  const slider3DV = document.getElementById('slider3DVert');

  if (sliderAxial) sliderAxial.addEventListener('input', (e) => { slicesState.axial = parseInt(e.target.value); window.renderAll2D(); });
  if (sliderSagittal) sliderSagittal.addEventListener('input', (e) => { slicesState.sagittal = parseInt(e.target.value); window.renderAll2D(); });
  if (sliderCoronal) sliderCoronal.addEventListener('input', (e) => { slicesState.coronal = parseInt(e.target.value); window.renderAll2D(); });
  if (slider3DH) slider3DH.addEventListener('input', (e) => { rot3DState.horiz = parseInt(e.target.value); window.render3D(); });
  if (slider3DV) slider3DV.addEventListener('input', (e) => { rot3DState.vert = parseInt(e.target.value); window.render3D(); });

  // Touch Scrubbing synchronized with exact frame count for 3D
  TouchController.bindScrub(document.getElementById('canvasAxial'), (step) => {
    const count = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_axial`] || currentCaseObj.slices.axial;
    slicesState.axial = Math.max(1, Math.min(count, slicesState.axial - step));
    document.getElementById('sliderAxial').value = slicesState.axial;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvasSagittal'), (step) => {
    const count = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_sagittal`] || currentCaseObj.slices.sagittal;
    slicesState.sagittal = Math.max(1, Math.min(count, slicesState.sagittal - step));
    document.getElementById('sliderSagittal').value = slicesState.sagittal;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvasCoronal'), (step) => {
    const count = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_coronal`] || currentCaseObj.slices.coronal;
    slicesState.coronal = Math.max(1, Math.min(count, slicesState.coronal - step));
    document.getElementById('sliderCoronal').value = slicesState.coronal;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvas3DHoriz'), (step) => {
    const countH = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_3d_horizontal`] || (currentCaseObj.views3d ? currentCaseObj.views3d.horizontal : 92);
    const degreePerFrame = 360 / countH;
    rot3DState.horiz = (rot3DState.horiz - step * degreePerFrame + 360) % 360;
    document.getElementById('slider3DHoriz').value = rot3DState.horiz;
    window.render3D();
  });

  TouchController.bindScrub(document.getElementById('canvas3DVert'), (step) => {
    const countV = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_3d_vertical`] || (currentCaseObj.views3d ? currentCaseObj.views3d.vertical : 108);
    const degreePerFrame = 360 / countV;
    rot3DState.vert = (rot3DState.vert - step * degreePerFrame + 360) % 360;
    document.getElementById('slider3DVert').value = rot3DState.vert;
    window.render3D();
  });
  // 5. STABILITY: Re-render when user returns from lock screen or app switch
  // Safari may suspend tab rendering; visibilitychange ensures canvas is always up-to-date
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentCaseObj) {
      window.renderAll2D();
      window.render3D();
    }
  });
});
