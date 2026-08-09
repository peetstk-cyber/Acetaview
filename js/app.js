/**
 * AcetaView — Dynamic 3D Vertical & Horizontal Rotation Limit Engine
 * Expands 3D Vertical Tilt capacity to 140+ frames for complete full-range scrolling.
 */

// 1. CASES DATA
window.CASES_DATA = [
  { id: "case-01", caseNumber: 1, title: "Case 01", folder: "Case01", slices: { axial: 140, sagittal: 108, coronal: 110 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-02", caseNumber: 2, title: "Case 02", folder: "Case02", slices: { axial: 140, sagittal: 115, coronal: 125 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-03", caseNumber: 3, title: "Case 03", folder: "Case03", slices: { axial: 110, sagittal: 95, coronal: 105 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-04", caseNumber: 4, title: "Case 04", folder: "Case04", slices: { axial: 105, sagittal: 90, coronal: 100 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-05", caseNumber: 5, title: "Case 05", folder: "Case05", slices: { axial: 130, sagittal: 110, coronal: 120 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-06", caseNumber: 6, title: "Case 06", folder: "Case06", slices: { axial: 125, sagittal: 105, coronal: 115 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-07", caseNumber: 7, title: "Case 07", folder: "Case07", slices: { axial: 135, sagittal: 112, coronal: 122 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-08", caseNumber: 8, title: "Case 08", folder: "Case08", slices: { axial: 118, sagittal: 98, coronal: 108 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-09", caseNumber: 9, title: "Case 09", folder: "Case09", slices: { axial: 115, sagittal: 95, coronal: 105 }, views3d: { horizontal: 72, vertical: 140 } },
  { id: "case-10", caseNumber: 10, title: "Case 10", folder: "Case10", slices: { axial: 145, sagittal: 120, coronal: 130 }, views3d: { horizontal: 72, vertical: 140 } }
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

// 2. SMART ON-DEMAND IMAGE SEQUENCE ENGINE (FULL RANGE AUTO-DETECT)
class ImageSequenceManager {
  constructor() {
    this.cache = {};
    this.available = {};
    this.detectedCounts = {};
    this.failedCount = {};
  }

  // Release JavaScript & GPU Memory when switching cases
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
    this.failedCount = {};
  }

  preloadCase(folderName, slicesObj) {
    this.clearCache();

    const planes = ['axial', 'sagittal', 'coronal', '3d_horizontal', '3d_vertical'];
    
    planes.forEach(plane => {
      const key = `${folderName}_${plane}`;
      const targetCount = (plane === '3d_horizontal') ? 72 : (plane === '3d_vertical') ? 140 : (slicesObj[plane] || 140);
      
      this.cache[key] = [];
      this.detectedCounts[key] = targetCount;

      // Preload initial ±10 frames around start and middle slices for instant response
      const mid = Math.floor(targetCount / 2);
      for (let offset = -10; offset <= 10; offset++) {
        if (mid + offset >= 1 && mid + offset <= targetCount) {
          this.loadSingleFrame(folderName, plane, mid + offset);
        }
        if (1 + offset >= 1 && 1 + offset <= targetCount) {
          this.loadSingleFrame(folderName, plane, 1 + offset);
        }
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
      if (index > (this.detectedCounts[key] || 0)) {
        this.detectedCounts[key] = index;
        if (plane === 'axial' || plane === 'sagittal' || plane === 'coronal') {
          window.updateSliderLimits(plane, index);
        }
      }

      if (plane === 'axial' || plane === 'sagittal' || plane === 'coronal') {
        window.renderAll2D();
      } else {
        window.render3D();
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
    
    let img = this.cache[key] ? this.cache[key][index - 1] : null;
    if (!img) {
      img = this.loadSingleFrame(folderName, plane, index);
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

      // Smart ±10 frames window preloader for smooth continuous rotation
      const maxCount = this.detectedCounts[key] || 140;
      for (let k = -10; k <= 10; k++) {
        if (k === 0) continue;
        const targetIdx = index + k;
        if (targetIdx >= 1 && targetIdx <= maxCount) {
          this.loadSingleFrame(folderName, plane, targetIdx);
        }
      }

      return true;
    }

    // Display clear, bright 18px "Loading..." text overlay while frame is fetching
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, cW, cH);
    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading...', cW / 2, cH / 2);

    const maxCount = this.detectedCounts[key] || 140;
    for (let k = -10; k <= 10; k++) {
      const targetIdx = index + k;
      if (targetIdx >= 1 && targetIdx <= maxCount) {
        this.loadSingleFrame(folderName, plane, targetIdx);
      }
    }

    return true;
  }
}

window.imageSequenceManager = new ImageSequenceManager();

// 3. REAL VIDEO ENGINE WITH ASPECT FIT
class VideoStreamManager {
  constructor() {
    this.videos = {
      axial: document.createElement('video'),
      sagittal: document.createElement('video'),
      coronal: document.createElement('video'),
      '3d_horizontal': document.createElement('video'),
      '3d_vertical': document.createElement('video')
    };

    this.loaded = {
      axial: false,
      sagittal: false,
      coronal: false,
      '3d_horizontal': false,
      '3d_vertical': false
    };

    this.isSeeking = {
      axial: false,
      sagittal: false,
      coronal: false,
      '3d_horizontal': false,
      '3d_vertical': false
    };

    Object.keys(this.videos).forEach(key => {
      const v = this.videos[key];
      v.muted = true;
      v.playsInline = true;
      v.webkitPlaysInline = true;
      v.preload = 'none';

      v.addEventListener('loadedmetadata', () => {
        this.loaded[key] = true;
        if (key === 'axial' || key === 'sagittal' || key === 'coronal') {
          window.renderAll2D();
        } else {
          window.render3D();
        }
      });

      v.addEventListener('seeking', () => { this.isSeeking[key] = true; });

      v.addEventListener('seeked', () => {
        this.isSeeking[key] = false;
        if (key === 'axial' || key === 'sagittal' || key === 'coronal') {
          window.drawVideoToCanvas(key);
        } else if (key === '3d_horizontal') {
          window.drawVideo3DHorizToCanvas();
        } else if (key === '3d_vertical') {
          window.drawVideo3DVertToCanvas();
        }
      });

      v.addEventListener('error', () => { this.loaded[key] = false; });
    });
  }

  loadCaseVideos(folderName) {
    const types = ['axial', 'sagittal', 'coronal', '3d_horizontal', '3d_vertical'];
    types.forEach(type => {
      this.loaded[type] = false;
      this.isSeeking[type] = false;
      const v = this.videos[type];
      v.src = `./videos/${folderName}/${type}.mp4`;
    });
  }

  seek2D(plane, ratio) {
    const v = this.videos[plane];
    if (this.loaded[plane] && v && v.duration) {
      const targetTime = Math.max(0, Math.min(v.duration - 0.02, ratio * v.duration));
      if (Math.abs(v.currentTime - targetTime) > 0.01 && !this.isSeeking[plane]) {
        v.currentTime = targetTime;
      }
      window.drawVideoToCanvas(plane);
      return true;
    }
    return false;
  }

  seek3DHorizontal(ratio) {
    const v = this.videos['3d_horizontal'];
    if (this.loaded['3d_horizontal'] && v && v.duration) {
      const targetTime = Math.max(0, Math.min(v.duration - 0.02, ratio * v.duration));
      if (Math.abs(v.currentTime - targetTime) > 0.01 && !this.isSeeking['3d_horizontal']) {
        v.currentTime = targetTime;
      }
      window.drawVideo3DHorizToCanvas();
      return true;
    }
    return false;
  }

  seek3DVertical(ratio) {
    const v = this.videos['3d_vertical'];
    if (this.loaded['3d_vertical'] && v && v.duration) {
      const targetTime = Math.max(0, Math.min(v.duration - 0.02, ratio * v.duration));
      if (Math.abs(v.currentTime - targetTime) > 0.01 && !this.isSeeking['3d_vertical']) {
        v.currentTime = targetTime;
      }
      window.drawVideo3DVertToCanvas();
      return true;
    }
    return false;
  }
}

window.videoStreamManager = new VideoStreamManager();

// 4. SYNTHETIC CANVAS FALLBACK ENGINE
class SyntheticCanvasRenderer {
  static render2DSlice(canvas, plane, currentSlice, totalSlices) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width || 400;
    const height = canvas.height || 400;

    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, width, height);

    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading...', width / 2, height / 2);
  }

  static render3DSingleView(canvas, rotH, isVert) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width || 400;
    const height = canvas.height || 400;

    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, width, height);

    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading...', width / 2, height / 2);
  }
}

// 5. TOUCH CONTROLLER ENGINE
class TouchController {
  static bindScrub(canvas, onStepChange) {
    if (!canvas) return;
    let startVal = 0;
    let isDragging = false;
    const pxPerStep = 4;

    const onStart = (e) => {
      isDragging = true;
      const touch = e.touches ? e.touches[0] : e;
      startVal = touch.clientX || touch.clientY;
    };

    const onMove = (e) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();

      const touch = e.touches ? e.touches[0] : e;
      const curVal = touch.clientX || touch.clientY;
      const d = startVal - curVal;

      if (Math.abs(d) >= pxPerStep) {
        const steps = Math.trunc(d / pxPerStep);
        if (steps !== 0) {
          onStepChange(steps);
          startVal = curVal;
        }
      }
    };

    const onEnd = () => { isDragging = false; };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);

    canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }
}

// 6. MAIN WORKSPACE APP STATE
let currentCaseObj = window.CASES_DATA[0];
let slicesState = { axial: 70, sagittal: 54, coronal: 55 };
let rot3DState = { horiz: 0, vert: 0 };
let currentMode = '2d';

window.updateSliderLimits = function(plane, maxCount) {
  let slider = null;
  if (plane === 'axial') slider = document.getElementById('sliderAxial');
  if (plane === 'sagittal') slider = document.getElementById('sliderSagittal');
  if (plane === 'coronal') slider = document.getElementById('sliderCoronal');

  if (slider) {
    slider.max = maxCount;
    if (slicesState[plane] > maxCount) slicesState[plane] = maxCount;
  }
  window.renderAll2D();
};

// Global Navigation Functions
window.openCase = function(caseId) {
  const found = window.CASES_DATA.find(c => c.id === caseId);
  if (found) currentCaseObj = found;

  window.imageSequenceManager.preloadCase(currentCaseObj.folder, currentCaseObj.slices);
  window.videoStreamManager.loadCaseVideos(currentCaseObj.folder);

  const homeView = document.getElementById('homeView');
  const caseView = document.getElementById('caseView');

  if (homeView) homeView.style.display = 'none';
  if (caseView) caseView.style.display = 'block';

  const dropdown = document.getElementById('caseSelectDropdown');
  if (dropdown) dropdown.value = currentCaseObj.id;

  slicesState.axial = Math.floor(currentCaseObj.slices.axial / 2);
  slicesState.sagittal = Math.floor(currentCaseObj.slices.sagittal / 2);
  slicesState.coronal = Math.floor(currentCaseObj.slices.coronal / 2);

  const sliderAxial = document.getElementById('sliderAxial');
  const sliderSagittal = document.getElementById('sliderSagittal');
  const sliderCoronal = document.getElementById('sliderCoronal');

  if (sliderAxial) { sliderAxial.max = currentCaseObj.slices.axial; sliderAxial.value = slicesState.axial; }
  if (sliderSagittal) { sliderSagittal.max = currentCaseObj.slices.sagittal; sliderSagittal.value = slicesState.sagittal; }
  if (sliderCoronal) { sliderCoronal.max = currentCaseObj.slices.coronal; sliderCoronal.value = slicesState.coronal; }

  rot3DState.horiz = 0;
  rot3DState.vert = 0;

  const slider3DH = document.getElementById('slider3DHoriz');
  const slider3DV = document.getElementById('slider3DVert');
  if (slider3DH) slider3DH.value = 0;
  if (slider3DV) slider3DV.value = 0;

  window.switchMode('2d');
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

    window.renderAll2D();
  } else {
    if (btn3D) btn3D.classList.add('active');
    if (btn2D) btn2D.classList.remove('active');
    if (layout2D) layout2D.style.display = 'none';
    if (layout3D) layout3D.style.display = 'block';

    window.render3D();
  }
};

window.renderAll2D = function() {
  const canvasAxial = document.getElementById('canvasAxial');
  const canvasSagittal = document.getElementById('canvasSagittal');
  const canvasCoronal = document.getElementById('canvasCoronal');

  window.resizeCanvas(canvasAxial);
  window.resizeCanvas(canvasSagittal);
  window.resizeCanvas(canvasCoronal);

  const ctxAxial = canvasAxial.getContext('2d');
  const ctxSag = canvasSagittal.getContext('2d');
  const ctxCor = canvasCoronal.getContext('2d');

  const hasImgAxial = window.imageSequenceManager.drawFrame(ctxAxial, currentCaseObj.folder, 'axial', slicesState.axial, canvasAxial.width, canvasAxial.height);
  const hasImgSag = window.imageSequenceManager.drawFrame(ctxSag, currentCaseObj.folder, 'sagittal', slicesState.sagittal, canvasSagittal.width, canvasSagittal.height);
  const hasImgCor = window.imageSequenceManager.drawFrame(ctxCor, currentCaseObj.folder, 'coronal', slicesState.coronal, canvasCoronal.width, canvasCoronal.height);

  if (!hasImgAxial) {
    const ratioAxial = (slicesState.axial - 1) / Math.max(1, currentCaseObj.slices.axial - 1);
    const hasAxialVid = window.videoStreamManager.seek2D('axial', ratioAxial);
    if (!hasAxialVid) SyntheticCanvasRenderer.render2DSlice(canvasAxial, 'axial', slicesState.axial, currentCaseObj.slices.axial);
  }

  if (!hasImgSag) {
    const ratioSagittal = (slicesState.sagittal - 1) / Math.max(1, currentCaseObj.slices.sagittal - 1);
    const hasSagVid = window.videoStreamManager.seek2D('sagittal', ratioSagittal);
    if (!hasSagVid) SyntheticCanvasRenderer.render2DSlice(canvasSagittal, 'sagittal', slicesState.sagittal, currentCaseObj.slices.sagittal);
  }

  if (!hasImgCor) {
    const ratioCoronal = (slicesState.coronal - 1) / Math.max(1, currentCaseObj.slices.coronal - 1);
    const hasCorVid = window.videoStreamManager.seek2D('coronal', ratioCoronal);
    if (!hasCorVid) SyntheticCanvasRenderer.render2DSlice(canvasCoronal, 'coronal', slicesState.coronal, currentCaseObj.slices.coronal);
  }

  document.getElementById('badgeAxial').textContent = `${slicesState.axial}/${currentCaseObj.slices.axial}`;
  document.getElementById('badgeSagittal').textContent = `${slicesState.sagittal}/${currentCaseObj.slices.sagittal}`;
  document.getElementById('badgeCoronal').textContent = `${slicesState.coronal}/${currentCaseObj.slices.coronal}`;
};

function drawVideoAspectFit(ctx, video, cW, cH) {
  const vW = video.videoWidth || 512;
  const vH = video.videoHeight || 512;

  const scale = Math.min(cW / vW, cH / vH);
  const drawW = vW * scale;
  const drawH = vH * scale;
  const drawX = (cW - drawW) / 2;
  const drawY = (cH - drawH) / 2;

  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, cW, cH);
  ctx.drawImage(video, drawX, drawY, drawW, drawH);
}

window.drawVideoToCanvas = function(plane) {
  let canvas = null;
  if (plane === 'axial') canvas = document.getElementById('canvasAxial');
  if (plane === 'sagittal') canvas = document.getElementById('canvasSagittal');
  if (plane === 'coronal') canvas = document.getElementById('canvasCoronal');

  if (!canvas) return;
  const video = window.videoStreamManager.videos[plane];
  if (video && (video.readyState >= 2 || video.currentTime > 0)) {
    const ctx = canvas.getContext('2d');
    drawVideoAspectFit(ctx, video, canvas.width, canvas.height);
  }
};

window.render3D = function() {
  const canvasH = document.getElementById('canvas3DHoriz');
  const canvasV = document.getElementById('canvas3DVert');

  window.resizeCanvas(canvasH);
  window.resizeCanvas(canvasV);

  const countH = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_3d_horizontal`] || 72;
  const ratioH = Math.max(0, Math.min(0.9999, (rot3DState.horiz % 360) / 360));
  const frameH = Math.floor(ratioH * countH) + 1;

  const countV = window.imageSequenceManager.detectedCounts[`${currentCaseObj.folder}_3d_vertical`] || 140;
  const ratioV = Math.max(0, Math.min(0.9999, (rot3DState.vert % 360) / 360));
  const frameV = Math.floor(ratioV * countV) + 1;

  const ctxH = canvasH.getContext('2d');
  const ctxV = canvasV.getContext('2d');

  const hasImgH = window.imageSequenceManager.drawFrame(ctxH, currentCaseObj.folder, '3d_horizontal', frameH, canvasH.width, canvasH.height);
  const hasImgV = window.imageSequenceManager.drawFrame(ctxV, currentCaseObj.folder, '3d_vertical', frameV, canvasV.width, canvasV.height);

  if (!hasImgH) {
    const rH = rot3DState.horiz / 360;
    const hasVidH = window.videoStreamManager.seek3DHorizontal(rH);
    if (!hasVidH) SyntheticCanvasRenderer.render3DSingleView(canvasH, rot3DState.horiz, false);
  }

  if (!hasImgV) {
    const rV = rot3DState.vert / 360;
    const hasVidV = window.videoStreamManager.seek3DVertical(rV);
    if (!hasVidV) SyntheticCanvasRenderer.render3DSingleView(canvasV, rot3DState.vert, true);
  }
};

window.drawVideo3DHorizToCanvas = function() {
  const canvas = document.getElementById('canvas3DHoriz');
  if (!canvas) return;
  const video = window.videoStreamManager.videos['3d_horizontal'];
  if (video && (video.readyState >= 2 || video.currentTime > 0)) {
    const ctx = canvas.getContext('2d');
    drawVideoAspectFit(ctx, video, canvas.width, canvas.height);
  }
};

window.drawVideo3DVertToCanvas = function() {
  const canvas = document.getElementById('canvas3DVert');
  if (!canvas) return;
  const video = window.videoStreamManager.videos['3d_vertical'];
  if (video && (video.readyState >= 2 || video.currentTime > 0)) {
    const ctx = canvas.getContext('2d');
    drawVideoAspectFit(ctx, video, canvas.width, canvas.height);
  }
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

  // Touch Scrubbing
  TouchController.bindScrub(document.getElementById('canvasAxial'), (step) => {
    slicesState.axial = Math.max(1, Math.min(currentCaseObj.slices.axial, slicesState.axial - step));
    document.getElementById('sliderAxial').value = slicesState.axial;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvasSagittal'), (step) => {
    slicesState.sagittal = Math.max(1, Math.min(currentCaseObj.slices.sagittal, slicesState.sagittal - step));
    document.getElementById('sliderSagittal').value = slicesState.sagittal;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvasCoronal'), (step) => {
    slicesState.coronal = Math.max(1, Math.min(currentCaseObj.slices.coronal, slicesState.coronal - step));
    document.getElementById('sliderCoronal').value = slicesState.coronal;
    window.renderAll2D();
  });

  TouchController.bindScrub(document.getElementById('canvas3DHoriz'), (step) => {
    rot3DState.horiz = (rot3DState.horiz - step * 2 + 360) % 360;
    document.getElementById('slider3DHoriz').value = rot3DState.horiz;
    window.render3D();
  });

  TouchController.bindScrub(document.getElementById('canvas3DVert'), (step) => {
    rot3DState.vert = (rot3DState.vert - step * 2 + 360) % 360;
    document.getElementById('slider3DVert').value = rot3DState.vert;
    window.render3D();
  });
});
