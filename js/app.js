/**
 * AcetaView — Exact Dynamic Frame Engine
 * Explicitly sets 3D Vertical Tilt default to 108 frames matching Case 01 data.
 */

// 1. CASES DATA
window.CASES_DATA = [
  { id: "case-01", caseNumber: 1, title: "Case 01", folder: "Case01", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-02", caseNumber: 2, title: "Case 02", folder: "Case02", slices: { axial: 160, sagittal: 153, coronal: 148 }, views3d: { horizontal: 27, vertical: 26 } },
  { id: "case-03", caseNumber: 3, title: "Case 03", folder: "Case03", slices: { axial: 103, sagittal: 106, coronal: 99 }, views3d: { horizontal: 24, vertical: 27 } },
  { id: "case-04", caseNumber: 4, title: "Case 04", folder: "Case04", slices: { axial: 101, sagittal: 98, coronal: 84 }, views3d: { horizontal: 32, vertical: 31 } },
  { id: "case-05", caseNumber: 5, title: "Case 05", folder: "Case05", slices: { axial: 100, sagittal: 96, coronal: 100 }, views3d: { horizontal: 18, vertical: 26 } },
  { id: "case-06", caseNumber: 6, title: "Case 06", folder: "Case06", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-07", caseNumber: 7, title: "Case 07", folder: "Case07", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-08", caseNumber: 8, title: "Case 08", folder: "Case08", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-09", caseNumber: 9, title: "Case 09", folder: "Case09", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-10", caseNumber: 10, title: "Case 10", folder: "Case10", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } }
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

  preloadCase(folderName, slicesObj, views3dObj) {
    this.clearCache();
    // Increment generation counter so stale scanNextBatch callbacks self-cancel
    this.generation = (this.generation || 0) + 1;
    const myGen = this.generation;

    const planes = ['axial', 'sagittal', 'coronal', '3d_horizontal', '3d_vertical'];
    
    planes.forEach(plane => {
      const key = `${folderName}_${plane}`;
      this.cache[key] = [];
      
      let defaultCount = 100;
      if (plane === '3d_horizontal') {
        defaultCount = (views3dObj && views3dObj.horizontal) ? views3dObj.horizontal : 92;
      } else if (plane === '3d_vertical') {
        defaultCount = (views3dObj && views3dObj.vertical) ? views3dObj.vertical : 108;
      } else if (slicesObj && slicesObj[plane]) {
        defaultCount = slicesObj[plane];
      }
      this.detectedCounts[key] = defaultCount;

      // PHASE 1: Load initial frames immediately on case open
      const initialLoad = Math.min(20, defaultCount);
      for (let i = 1; i <= initialLoad; i++) {
        this.loadSingleFrame(folderName, plane, i);
      }

      // PHASE 2: Background key-frame scan in small batches every 200ms
      const batchSize = 5;
      const maxScan = (plane === '3d_horizontal') ? Math.max(defaultCount + 10, 110)
                    : (plane === '3d_vertical')   ? Math.max(defaultCount + 10, 120)
                    : Math.max(defaultCount + 10, 200);
      let batchStart = initialLoad + 1;
      let consecutiveMiss = 0; // Early-stop: track consecutive frames with no valid image

      const scanNextBatch = () => {
        // Stop if case changed
        if (myGen !== this.generation) return;

        const batchEnd = Math.min(batchStart + batchSize - 1, maxScan);
        for (let i = batchStart; i <= batchEnd; i++) {
          const img = this.loadSingleFrame(folderName, plane, i);

          const frameIdx = i;
          setTimeout(() => {
            if (myGen !== this.generation) return;
            const slot = this.cache[key] ? this.cache[key][frameIdx - 1] : undefined;
            if (slot === null) {
              consecutiveMiss++;
            } else if (slot && slot.complete && slot.naturalWidth > 0) {
              consecutiveMiss = 0; // reset on any successful frame
            }
          }, 2000);
        }

        batchStart += batchSize;

        // Stop scanning if: reached maxScan OR 3 consecutive misses detected
        if (batchStart <= maxScan && consecutiveMiss < 3) {
          setTimeout(scanNextBatch, 200);
        }
      };

      if (batchStart <= maxScan) {
        setTimeout(scanNextBatch, 500);
      }
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

      ctx.fillStyle = '#000000';
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

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cW, cH);
    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillStyle = '#48c79c';
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
    let lastY = 0;
    let isDragging = false;
    let isHorizontalGesture = null;

    const onStart = (e) => {
      isDragging = true;
      isHorizontalGesture = null;
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
      lastY = touch.clientY;
    };

    const onMove = (e) => {
      if (!isDragging) return;

      const touch = e.touches ? e.touches[0] : e;
      const curX = touch.clientX;
      const curY = touch.clientY;
      const diffX = curX - startX;
      const diffY = curY - startY;

      const isMobile = window.innerWidth <= 600;

      if (isMobile) {
        // MOBILE VERSION (<= 600px): Horizontal Scrubbing (Left/Right)
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

        // If user is scrolling the page vertically on mobile, do not interfere
        if (isHorizontalGesture === false) return;

        if (e.cancelable) e.preventDefault();

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
      } else {
        // DESKTOP & TABLET VERSION (> 600px): Vertical Scrubbing (Up/Down PACS standard)
        if (e.cancelable) e.preventDefault();

        const box = canvas.closest('.viewport-box');
        const isFullscreen = box ? box.classList.contains('fullscreen') : false;
        const pxPerStep = isFullscreen ? 12 : 6;

        // Dragging DOWN advances slice forward, dragging UP moves backward
        const d = lastY - curY;
        if (Math.abs(d) >= pxPerStep) {
          const steps = Math.trunc(d / pxPerStep);
          if (steps !== 0) {
            onStepChange(steps);
            lastY = curY;
          }
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
let currentViewMode = 2; // 2 = 2-View Fit (default), 3 = 3-View Fit
let slotPlanes = { 1: 'axial', 2: 'coronal', 3: 'sagittal' };

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
  [1, 2, 3].forEach(slotNum => {
    if (slotPlanes[slotNum] === plane) {
      const slider = document.getElementById(`sliderSlot${slotNum}`);
      if (slider && maxCount > 0) {
        slider.max = maxCount;
        if (slicesState[plane] > maxCount) slicesState[plane] = maxCount;
      }
    }
  });
  // Debounce: slider limit updates can fire rapidly during batch load — coalesce into 1 render
  clearTimeout(window._sliderDebounce);
  window._sliderDebounce = setTimeout(() => window.renderAll2D(), 16);
};

// Global Navigation Functions
window.openCase = function(caseId) {
  const found = window.CASES_DATA.find(c => c.id === caseId);
  if (found) currentCaseObj = found;

  window.imageSequenceManager.preloadCase(currentCaseObj.folder, currentCaseObj.slices, currentCaseObj.views3d);

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

  [1, 2, 3].forEach(slotNum => {
    const plane = slotPlanes[slotNum];
    const slider = document.getElementById(`sliderSlot${slotNum}`);
    const count = currentCaseObj.slices[plane] || 100;
    if (slider) {
      slider.max = count;
      slider.value = 1;
    }
  });

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

window.setSlotPlane = function(slotNum, plane, shouldRender = true) {
  slotPlanes[slotNum] = plane;

  const slotEl = document.getElementById(`viewportSlot${slotNum}`);
  if (slotEl) {
    const buttons = slotEl.querySelectorAll('.btn-plane-toggle');
    buttons.forEach(btn => {
      if (btn.dataset.plane === plane) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  const count = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_${plane}`] || (currentCaseObj.slices ? currentCaseObj.slices[plane] : 100);
  const slider = document.getElementById(`sliderSlot${slotNum}`);
  if (slider) {
    slider.max = count;
    slider.value = slicesState[plane] || 1;
  }

  if (shouldRender) {
    window.renderAll2D();
  }
};

window.toggleViewOption = function() {
  currentViewMode = (currentViewMode === 2) ? 3 : 2;
  const layout2D = document.getElementById('layout2D');
  const btn = document.getElementById('btnViewOption');

  if (layout2D) {
    if (currentViewMode === 3) {
      layout2D.classList.remove('mode-2view');
      layout2D.classList.add('mode-3view');
      window.setSlotPlane(1, 'axial', false);
      window.setSlotPlane(2, 'coronal', false);
      window.setSlotPlane(3, 'sagittal', false);
    } else {
      layout2D.classList.remove('mode-3view');
      layout2D.classList.add('mode-2view');
      window.setSlotPlane(1, 'axial', false);
      window.setSlotPlane(2, 'coronal', false);
    }
  }

  if (btn) {
    const icon = btn.querySelector('i');
    if (currentViewMode === 3) {
      btn.classList.add('active');
      btn.title = 'Current: 3-View Fit (Click for 2-View Fit)';
      if (icon) icon.className = 'fa-solid fa-table-cells';
    } else {
      btn.classList.remove('active');
      btn.title = 'Current: 2-View Fit (Click for 3-View Fit)';
      if (icon) icon.className = 'fa-solid fa-table-columns';
    }
  }

  window.renderAll2D();
  window.render3D();
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
    const activeSlots = (currentViewMode === 3) ? [1, 2, 3] : [1, 2];
    activeSlots.forEach(slotNum => {
      const canvas = document.getElementById(`canvasSlot${slotNum}`);
      if (!canvas) return;

      window.resizeCanvas(canvas);
      const ctx = canvas.getContext('2d');
      const plane = slotPlanes[slotNum] || (slotNum === 1 ? 'axial' : slotNum === 2 ? 'coronal' : 'sagittal');
      const sliceIdx = slicesState[plane] || 1;
      const count = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_${plane}`] || (currentCaseObj.slices ? currentCaseObj.slices[plane] : 100);

      window.imageSequenceManager.drawFrame(ctx, currentCaseObj.folder, plane, sliceIdx, canvas.width, canvas.height);

      const badge = document.getElementById(`badgeSlot${slotNum}`);
      if (badge) badge.textContent = `${sliceIdx}/${count}`;

      const slider = document.getElementById(`sliderSlot${slotNum}`);
      if (slider) {
        slider.max = count;
        slider.value = sliceIdx;
      }
      window.updateSliderProgress(`sliderSlot${slotNum}`);
    });
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
  if (btnHome) btnHome.addEventListener('click', () => window.handleHomeClick());

  const btn2D = document.getElementById('btnMode2D');
  const btn3D = document.getElementById('btnMode3D');
  if (btn2D) btn2D.addEventListener('click', () => window.switchMode('2d'));
  if (btn3D) btn3D.addEventListener('click', () => window.switchMode('3d'));

  // Sliders for 2D Slots 1, 2, 3
  const sliderSlot1 = document.getElementById('sliderSlot1');
  const sliderSlot2 = document.getElementById('sliderSlot2');
  const sliderSlot3 = document.getElementById('sliderSlot3');
  const slider3DH = document.getElementById('slider3DHoriz');
  const slider3DV = document.getElementById('slider3DVert');

  if (sliderSlot1) sliderSlot1.addEventListener('input', (e) => {
    const plane = slotPlanes[1];
    slicesState[plane] = parseInt(e.target.value);
    window.renderAll2D();
  });
  if (sliderSlot2) sliderSlot2.addEventListener('input', (e) => {
    const plane = slotPlanes[2];
    slicesState[plane] = parseInt(e.target.value);
    window.renderAll2D();
  });
  if (sliderSlot3) sliderSlot3.addEventListener('input', (e) => {
    const plane = slotPlanes[3];
    slicesState[plane] = parseInt(e.target.value);
    window.renderAll2D();
  });
  if (slider3DH) slider3DH.addEventListener('input', (e) => { rot3DState.horiz = parseInt(e.target.value); window.render3D(); });
  if (slider3DV) slider3DV.addEventListener('input', (e) => { rot3DState.vert = parseInt(e.target.value); window.render3D(); });

  // Touch Scrubbing for 2D Slots 1, 2, 3
  TouchController.bindScrub(document.getElementById('canvasSlot1'), (step) => {
    const plane = slotPlanes[1];
    const count = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_${plane}`] || currentCaseObj.slices[plane];
    slicesState[plane] = Math.max(1, Math.min(count, slicesState[plane] - step));
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvasSlot2'), (step) => {
    const plane = slotPlanes[2];
    const count = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_${plane}`] || currentCaseObj.slices[plane];
    slicesState[plane] = Math.max(1, Math.min(count, slicesState[plane] - step));
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvasSlot3'), (step) => {
    const plane = slotPlanes[3];
    const count = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_${plane}`] || currentCaseObj.slices[plane];
    slicesState[plane] = Math.max(1, Math.min(count, slicesState[plane] - step));
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

// ==========================================
// 6. CONFIDENTIAL ADMIN CASE METADATA SYSTEM
// ==========================================
let homeClickCount = 0;
let homeClickTimer = null;

window.handleHomeClick = function() {
  homeClickCount++;
  clearTimeout(homeClickTimer);

  if (homeClickCount >= 7) {
    homeClickCount = 0;
    window.openAdminModal();
  } else {
    homeClickTimer = setTimeout(() => {
      homeClickCount = 0;
    }, 2500); // 2.5 seconds window for 7 rapid clicks
  }

  window.showHome();
};

window.getAdminData = function() {
  const saved = localStorage.getItem('acetaview_admin_cases');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('Error parsing admin data:', e);
    }
  }
  return window.CASES_DATA.map(c => ({
    id: c.id,
    title: c.title,
    patientName: '',
    hn: '',
    diagnosis: ''
  }));
};

window.openAdminModal = function() {
  const modal = document.getElementById('adminModal');
  if (!modal) return;
  window.renderAdminCasesList();
  modal.style.display = 'flex';
};

window.closeAdminModal = function() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.style.display = 'none';
};

window.renderAdminCasesList = function() {
  const container = document.getElementById('adminCasesList');
  if (!container) return;

  const data = window.getAdminData();
  container.innerHTML = '';

  data.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'admin-case-item';
    card.innerHTML = `
      <div class="admin-case-tag">
        <i class="fa-solid fa-folder-medical"></i> ${item.title || ('Case ' + String(index + 1).padStart(2, '0'))}
      </div>
      <div class="admin-input-group">
        <label class="admin-input-label">ชื่อ - นามสกุล (Patient Name)</label>
        <input type="text" class="admin-input" id="admin_name_${item.id}" placeholder="เช่น นายสมชาย ใจดี" value="${item.patientName || ''}">
      </div>
      <div class="admin-input-group">
        <label class="admin-input-label">HN (Hospital No.)</label>
        <input type="text" class="admin-input" id="admin_hn_${item.id}" placeholder="เช่น 10024567" value="${item.hn || ''}">
      </div>
      <div class="admin-input-group">
        <label class="admin-input-label">Diag (การวินิจฉัยโรค)</label>
        <input type="text" class="admin-input" id="admin_diag_${item.id}" placeholder="เช่น Acetabulum Posterior Wall Fracture" value="${item.diagnosis || ''}">
      </div>
    `;
    container.appendChild(card);
  });
};

window.saveAdminData = function() {
  const currentData = window.getAdminData();
  const updatedData = currentData.map(item => {
    const nameInput = document.getElementById(`admin_name_${item.id}`);
    const hnInput = document.getElementById(`admin_hn_${item.id}`);
    const diagInput = document.getElementById(`admin_diag_${item.id}`);

    return {
      id: item.id,
      title: item.title,
      patientName: nameInput ? nameInput.value.trim() : (item.patientName || ''),
      hn: hnInput ? hnInput.value.trim() : (item.hn || ''),
      diagnosis: diagInput ? diagInput.value.trim() : (item.diagnosis || '')
    };
  });

  localStorage.setItem('acetaview_admin_cases', JSON.stringify(updatedData, null, 2));
  window.showAdminToast('บันทึกข้อมูลลง Browser Storage สำเร็จแล้ว');
};

let _adminFileHandle = null;

window.openLocalFile = async function() {
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });
      _adminFileHandle = handle;
      const file = await _adminFileHandle.getFile();
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      if (Array.isArray(parsed)) {
        localStorage.setItem('acetaview_admin_cases', JSON.stringify(parsed, null, 2));
        window.renderAdminCasesList();
        window.showAdminToast(`โหลดข้อมูลจากไฟล์ "${file.name}" สำเร็จแล้ว`);
      }
    } else {
      // Fallback for Safari / mobile: invisible file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            if (Array.isArray(parsed)) {
              localStorage.setItem('acetaview_admin_cases', JSON.stringify(parsed, null, 2));
              window.renderAdminCasesList();
              window.showAdminToast(`โหลดข้อมูลจาก "${file.name}" สำเร็จแล้ว`);
            }
          } catch (err) {
            alert('ไฟล์ JSON ไม่ถูกต้อง');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  }
};

window.saveDirectlyToFile = async function() {
  window.saveAdminData();
  const data = window.getAdminData();
  const jsonStr = JSON.stringify(data, null, 2);

  try {
    if ('showSaveFilePicker' in window) {
      if (!_adminFileHandle) {
        _adminFileHandle = await window.showSaveFilePicker({
          suggestedName: 'cases_metadata.json',
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }]
        });
      }
      const writable = await _adminFileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
      window.showAdminToast('✅ บันทึกลงไฟล์ในเครื่องเรียบร้อยแล้ว!');
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('File System Access API error:', err);
  }

  // Fallback direct download if File System Access API is not supported in the current browser
  window.downloadAdminDataJson(jsonStr);
};

window.exportAdminData = function() {
  window.saveAdminData();
  const data = window.getAdminData();
  const jsonStr = JSON.stringify(data, null, 2);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(() => {
      window.showAdminToast('คัดลอก JSON Data ลง Clipboard แล้ว');
    }).catch(() => {
      window.downloadAdminDataJson(jsonStr);
    });
  } else {
    window.downloadAdminDataJson(jsonStr);
  }
};

window.downloadAdminDataJson = function(jsonStr) {
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cases_metadata.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.showAdminToast('ดาวน์โหลดไฟล์ cases_metadata.json เรียบร้อยแล้ว');
};

window.showAdminToast = function(msg) {
  const toast = document.getElementById('adminToast');
  const toastText = document.getElementById('adminToastText');
  if (!toast) return;

  if (toastText && msg) toastText.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
};
