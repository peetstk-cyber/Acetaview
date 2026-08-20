/**
 * AcetaView — High Performance CT Imaging Engine
 * Optimized for Concurrent iPad Testing (30+ simultaneous users)
 * 
 * Features:
 * - Deterministic Zero-404 Image Fetching
 * - Active Window Preloading & Background Progressive Cache
 * - Off-Thread Bitmap Decoding (img.decode) for Zero-Jank 60 FPS Scrubbing
 * - Elimination of Layout Thrashing (Cached Viewport Dimensions)
 * - Direction-Locked Smooth Touch Scrubbing
 */

// 1. VERIFIED EXACT CASES DATASET
window.CASES_DATA = [
  { id: "case-01", caseNumber: 1, title: "Case 01", folder: "Case01", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-02", caseNumber: 2, title: "Case 02", folder: "Case02", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-03", caseNumber: 3, title: "Case 03", folder: "Case03", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-04", caseNumber: 4, title: "Case 04", folder: "Case04", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-05", caseNumber: 5, title: "Case 05", folder: "Case05", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-06", caseNumber: 6, title: "Case 06", folder: "Case06", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-07", caseNumber: 7, title: "Case 07", folder: "Case07", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-08", caseNumber: 8, title: "Case 08", folder: "Case08", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-09", caseNumber: 9, title: "Case 09", folder: "Case09", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } },
  { id: "case-10", caseNumber: 10, title: "Case 10", folder: "Case10", slices: { axial: 140, sagittal: 111, coronal: 108 }, views3d: { horizontal: 92, vertical: 108 } }
];

// Helper to construct exact frame URL
function getExactFrameUrl(folderName, plane, index) {
  const s = String(index).padStart(3, '0');
  return `./videos/${folderName}/${plane}/ezgif-frame-${s}.jpg`;
}

// 2. HIGH-EFFICIENCY IMAGE SEQUENCE MANAGER
class ImageSequenceManager {
  constructor() {
    this.cache = new Map(); // key: "folder_plane_index" -> HTMLImageElement
    this.loading = new Set();
    this.generation = 0;
  }

  clearCache() {
    this.generation++;
    this.cache.forEach(img => {
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      }
    });
    this.cache.clear();
    this.loading.clear();
  }

  getFrameCount(caseObj, plane) {
    if (plane === 'axial') return caseObj.slices.axial;
    if (plane === 'sagittal') return caseObj.slices.sagittal;
    if (plane === 'coronal') return caseObj.slices.coronal;
    if (plane === '3d_horizontal') return caseObj.views3d.horizontal;
    if (plane === '3d_vertical') return caseObj.views3d.vertical;
    return 100;
  }

  preloadCase(caseObj, initialCenterSlices = { axial: 70, sagittal: 55, coronal: 54, '3d_horizontal': 1, '3d_vertical': 1 }) {
    this.clearCache();
    const currentGen = this.generation;
    const folder = caseObj.folder;
    const planes = ['axial', 'sagittal', 'coronal', '3d_horizontal', '3d_vertical'];

    // PHASE 1: Priority Window Preload (Immediate ±10 frames around starting position)
    // Ensures instant tactile response while keeping initial burst lightweight
    planes.forEach(plane => {
      const maxCount = this.getFrameCount(caseObj, plane);
      const center = initialCenterSlices[plane] || 1;
      const windowRadius = 10;

      for (let offset = 0; offset <= windowRadius; offset++) {
        const rightIdx = center + offset;
        const leftIdx = center - offset;
        if (rightIdx <= maxCount) this.loadSingleFrame(folder, plane, rightIdx, true);
        if (leftIdx >= 1 && leftIdx !== rightIdx) this.loadSingleFrame(folder, plane, leftIdx, true);
      }
    });

    // PHASE 2: Polite Background Queue (Progressively loads remaining frames)
    // Avoids congesting the network connection pool for concurrent users
    setTimeout(() => {
      if (currentGen !== this.generation) return;
      this.startBackgroundQueue(caseObj, currentGen);
    }, 400);
  }

  startBackgroundQueue(caseObj, gen) {
    const planes = ['axial', 'sagittal', 'coronal', '3d_horizontal', '3d_vertical'];
    const queue = [];

    planes.forEach(plane => {
      const maxCount = this.getFrameCount(caseObj, plane);
      for (let i = 1; i <= maxCount; i++) {
        const key = `${caseObj.folder}_${plane}_${i}`;
        if (!this.cache.has(key)) {
          queue.push({ folder: caseObj.folder, plane, index: i });
        }
      }
    });

    const BATCH_SIZE = 6;
    const processBatch = () => {
      if (gen !== this.generation || queue.length === 0) return;

      const batch = queue.splice(0, BATCH_SIZE);
      batch.forEach(item => this.loadSingleFrame(item.folder, item.plane, item.index, false));

      if (queue.length > 0) {
        setTimeout(processBatch, 100);
      }
    };

    processBatch();
  }

  loadSingleFrame(folderName, plane, index, isPriority = false) {
    if (index < 1) return null;
    const key = `${folderName}_${plane}_${index}`;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    if (this.loading.has(key)) {
      return null;
    }

    this.loading.add(key);
    const img = new Image();
    img.src = getExactFrameUrl(folderName, plane, index);

    // Asynchronous off-main-thread decode if supported by browser (WebKit / iOS Safari)
    if ('decode' in img) {
      img.decode().then(() => {
        this.cache.set(key, img);
        this.loading.delete(key);
        this.requestRepaint(plane);
      }).catch(() => {
        // Fallback onload for network or decode edge cases
        img.onload = () => {
          this.cache.set(key, img);
          this.loading.delete(key);
          this.requestRepaint(plane);
        };
        img.onerror = () => {
          this.loading.delete(key);
        };
      });
    } else {
      img.onload = () => {
        this.cache.set(key, img);
        this.loading.delete(key);
        this.requestRepaint(plane);
      };
      img.onerror = () => {
        this.loading.delete(key);
      };
    }

    return img;
  }

  requestRepaint(plane) {
    if (plane === 'axial' || plane === 'sagittal' || plane === 'coronal') {
      if (!window._rafPending2D) {
        window._rafPending2D = true;
        requestAnimationFrame(() => {
          window._rafPending2D = false;
          window.renderAll2D();
        });
      }
    } else {
      if (!window._rafPending3D) {
        window._rafPending3D = true;
        requestAnimationFrame(() => {
          window._rafPending3D = false;
          window.render3D();
        });
      }
    }
  }

  drawFrame(ctx, folderName, plane, index, maxCount, cW, cH) {
    const safeIndex = Math.max(1, Math.min(maxCount, index));
    const key = `${folderName}_${plane}_${safeIndex}`;

    let img = this.cache.get(key);
    if (!img) {
      this.loadSingleFrame(folderName, plane, safeIndex, true);
    }

    // Always fill background
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, cW, cH);

    if (img && img.complete && img.naturalWidth > 0) {
      const vW = img.naturalWidth;
      const vH = img.naturalHeight;
      const scale = Math.min(cW / vW, cH / vH);
      const drawW = vW * scale;
      const drawH = vH * scale;
      const drawX = (cW - drawW) / 2;
      const drawY = (cH - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Opportunistic local pre-fetch ±5 frames in scrub direction
      for (let k = -5; k <= 5; k++) {
        if (k === 0) continue;
        const targetIdx = ((safeIndex - 1 + k + maxCount) % maxCount + maxCount) % maxCount + 1;
        this.loadSingleFrame(folderName, plane, targetIdx, false);
      }
      return true;
    }

    // Loading indicator
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Loading slice ${safeIndex}...`, cW / 2, cH / 2);
    return false;
  }
}

window.imageSequenceManager = new ImageSequenceManager();

// 3. TOUCH CONTROLLER ENGINE (HIGH PRECISION & GESTURE ISOLATION)
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

      // Smart Gesture Locking: Lock direction after 4px of movement
      if (isHorizontalGesture === null) {
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);
        if (absX < 4 && absY < 4) return;

        if (absY > absX) {
          isHorizontalGesture = false; // Vertical swipe -> allow native page scrolling
          return;
        } else {
          isHorizontalGesture = true;  // Horizontal swipe -> lock gesture to CT slice scrubbing
        }
      }

      if (isHorizontalGesture === false) return;

      if (e.cancelable) e.preventDefault();

      // Dynamic sensitivity: 10px in Fullscreen, 5px in Grid View
      const box = canvas.closest('.viewport-box');
      const isFullscreen = box ? box.classList.contains('fullscreen') : false;
      const pxPerStep = isFullscreen ? 10 : 5;

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

// 4. MAIN WORKSPACE APP STATE & CACHED VIEWPORT SYSTEM
let currentCaseObj = window.CASES_DATA[0];
let slicesState = { axial: 70, sagittal: 55, coronal: 54 };
let rot3DState = { horiz: 0, vert: 0 };
let currentMode = '2d';

// Cached canvas dimensions to eliminate Layout Thrashing (zero getBoundingClientRect in draw loop)
const canvasSizeCache = new Map();

function updateAllCanvasSizes() {
  const canvases = [
    document.getElementById('canvasAxial'),
    document.getElementById('canvasSagittal'),
    document.getElementById('canvasCoronal'),
    document.getElementById('canvas3DHoriz'),
    document.getElementById('canvas3DVert')
  ];

  const dpr = window.devicePixelRatio || 1;

  canvases.forEach(canvas => {
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const targetW = rect.width > 0 ? Math.floor(rect.width * dpr) : 400;
    const targetH = rect.height > 0 ? Math.floor(rect.height * dpr) : 400;

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    canvasSizeCache.set(canvas.id, { width: targetW, height: targetH });
  });
}

// Sliders Progress Bar update
window.updateSliderProgress = function(sliderId) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  slider.style.setProperty('--progress', `${pct.toFixed(2)}%`);
};

// Global Navigation
window.openCase = function(caseId) {
  const found = window.CASES_DATA.find(c => c.id === caseId);
  if (found) currentCaseObj = found;

  slicesState.axial = Math.floor(currentCaseObj.slices.axial / 2);
  slicesState.sagittal = Math.floor(currentCaseObj.slices.sagittal / 2);
  slicesState.coronal = Math.floor(currentCaseObj.slices.coronal / 2);
  rot3DState.horiz = 0;
  rot3DState.vert = 0;

  window.imageSequenceManager.preloadCase(currentCaseObj, slicesState);

  // Close any active fullscreen box
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

  // Configure sliders
  const sliderAxial = document.getElementById('sliderAxial');
  const sliderSagittal = document.getElementById('sliderSagittal');
  const sliderCoronal = document.getElementById('sliderCoronal');

  if (sliderAxial) { sliderAxial.max = currentCaseObj.slices.axial; sliderAxial.value = slicesState.axial; }
  if (sliderSagittal) { sliderSagittal.max = currentCaseObj.slices.sagittal; sliderSagittal.value = slicesState.sagittal; }
  if (sliderCoronal) { sliderCoronal.max = currentCaseObj.slices.coronal; sliderCoronal.value = slicesState.coronal; }

  const slider3DH = document.getElementById('slider3DHoriz');
  const slider3DV = document.getElementById('slider3DVert');
  if (slider3DH) slider3DH.value = 0;
  if (slider3DV) slider3DV.value = 0;

  window.switchMode('2d');
  setTimeout(updateAllCanvasSizes, 50);
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
  currentMode = mode;
  const btn2D = document.getElementById('btnMode2D');
  const btn3D = document.getElementById('btnMode3D');
  const layout2D = document.getElementById('layout2D');
  const layout3D = document.getElementById('layout3D');

  if (mode === '2d') {
    if (btn2D) btn2D.classList.add('active');
    if (btn3D) btn3D.classList.remove('active');
    if (layout2D) layout2D.style.display = 'grid';
    if (layout3D) layout3D.style.display = 'none';
    updateAllCanvasSizes();
    window.renderAll2D();
  } else {
    if (btn3D) btn3D.classList.add('active');
    if (btn2D) btn2D.classList.remove('active');
    if (layout2D) layout2D.style.display = 'none';
    if (layout3D) layout3D.style.display = 'block';
    updateAllCanvasSizes();
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
    if (icon) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
  } else {
    if (icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
  }

  updateAllCanvasSizes();
  if (currentMode === '2d') window.renderAll2D();
  else window.render3D();
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.viewport-box.fullscreen').forEach(box => {
      box.classList.remove('fullscreen');
      const icon = box.querySelector('.btn-fullscreen i');
      if (icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
    });
    document.body.classList.remove('has-fullscreen');
    updateAllCanvasSizes();
    if (currentMode === '2d') window.renderAll2D();
    else window.render3D();
  }
});

// 5. HIGH-SPEED 60 FPS RENDER LOOPS
window.renderAll2D = function() {
  const canvasAxial = document.getElementById('canvasAxial');
  const canvasSag = document.getElementById('canvasSagittal');
  const canvasCor = document.getElementById('canvasCoronal');

  if (!canvasAxial || !canvasSag || !canvasCor) return;

  const sizeAxial = canvasSizeCache.get('canvasAxial') || { width: canvasAxial.width, height: canvasAxial.height };
  const sizeSag = canvasSizeCache.get('canvasSagittal') || { width: canvasSag.width, height: canvasSag.height };
  const sizeCor = canvasSizeCache.get('canvasCoronal') || { width: canvasCor.width, height: canvasCor.height };

  const ctxAxial = canvasAxial.getContext('2d');
  const ctxSag = canvasSag.getContext('2d');
  const ctxCor = canvasCor.getContext('2d');

  window.imageSequenceManager.drawFrame(ctxAxial, currentCaseObj.folder, 'axial', slicesState.axial, currentCaseObj.slices.axial, sizeAxial.width, sizeAxial.height);
  window.imageSequenceManager.drawFrame(ctxSag, currentCaseObj.folder, 'sagittal', slicesState.sagittal, currentCaseObj.slices.sagittal, sizeSag.width, sizeSag.height);
  window.imageSequenceManager.drawFrame(ctxCor, currentCaseObj.folder, 'coronal', slicesState.coronal, currentCaseObj.slices.coronal, sizeCor.width, sizeCor.height);

  document.getElementById('badgeAxial').textContent = `${slicesState.axial}/${currentCaseObj.slices.axial}`;
  document.getElementById('badgeSagittal').textContent = `${slicesState.sagittal}/${currentCaseObj.slices.sagittal}`;
  document.getElementById('badgeCoronal').textContent = `${slicesState.coronal}/${currentCaseObj.slices.coronal}`;

  window.updateSliderProgress('sliderAxial');
  window.updateSliderProgress('sliderSagittal');
  window.updateSliderProgress('sliderCoronal');
};

window.render3D = function() {
  const canvasH = document.getElementById('canvas3DHoriz');
  const canvasV = document.getElementById('canvas3DVert');

  if (!canvasH || !canvasV) return;

  const sizeH = canvasSizeCache.get('canvas3DHoriz') || { width: canvasH.width, height: canvasH.height };
  const sizeV = canvasSizeCache.get('canvas3DVert') || { width: canvasV.width, height: canvasV.height };

  const countH = currentCaseObj.views3d.horizontal;
  const ratioH = Math.max(0, Math.min(0.9999, (rot3DState.horiz % 360) / 360));
  const frameH = Math.floor(ratioH * countH) + 1;

  const countV = currentCaseObj.views3d.vertical;
  const ratioV = Math.max(0, Math.min(0.9999, (rot3DState.vert % 360) / 360));
  const frameV = Math.floor(ratioV * countV) + 1;

  const ctxH = canvasH.getContext('2d');
  const ctxV = canvasV.getContext('2d');

  window.imageSequenceManager.drawFrame(ctxH, currentCaseObj.folder, '3d_horizontal', frameH, countH, sizeH.width, sizeH.height);
  window.imageSequenceManager.drawFrame(ctxV, currentCaseObj.folder, '3d_vertical', frameV, countV, sizeV.width, sizeV.height);

  window.updateSliderProgress('slider3DHoriz');
  window.updateSliderProgress('slider3DVert');
};

// 6. DOM BOOTSTRAP
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

  // Sliders input events
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

  // Touch Scrubbing
  TouchController.bindScrub(document.getElementById('canvasAxial'), (step) => {
    slicesState.axial = Math.max(1, Math.min(currentCaseObj.slices.axial, slicesState.axial - step));
    sliderAxial.value = slicesState.axial;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvasSagittal'), (step) => {
    slicesState.sagittal = Math.max(1, Math.min(currentCaseObj.slices.sagittal, slicesState.sagittal - step));
    sliderSagittal.value = slicesState.sagittal;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvasCoronal'), (step) => {
    slicesState.coronal = Math.max(1, Math.min(currentCaseObj.slices.coronal, slicesState.coronal - step));
    sliderCoronal.value = slicesState.coronal;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvas3DHoriz'), (step) => {
    const countH = currentCaseObj.views3d.horizontal;
    const degreePerFrame = 360 / countH;
    rot3DState.horiz = (rot3DState.horiz - step * degreePerFrame + 360) % 360;
    slider3DH.value = rot3DState.horiz;
    window.render3D();
  });

  TouchController.bindScrub(document.getElementById('canvas3DVert'), (step) => {
    const countV = currentCaseObj.views3d.vertical;
    const degreePerFrame = 360 / countV;
    rot3DState.vert = (rot3DState.vert - step * degreePerFrame + 360) % 360;
    slider3DV.value = rot3DState.vert;
    window.render3D();
  });

  // Window Resize & Orientation Change
  window.addEventListener('resize', () => {
    updateAllCanvasSizes();
    if (currentMode === '2d') window.renderAll2D();
    else window.render3D();
  });

  // App Switch / iPad Safari Tab Wakeup
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentCaseObj) {
      updateAllCanvasSizes();
      if (currentMode === '2d') window.renderAll2D();
      else window.render3D();
    }
  });

  updateAllCanvasSizes();
});
