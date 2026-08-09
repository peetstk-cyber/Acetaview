/**
 * Video Player & Touch Scrub Engine for Acetabulum Research Platform
 */

window.CaseVideoController = class CaseVideoController {
  constructor(caseObj) {
    this.caseObj = caseObj;
    this.videoElements = {
      axial: null,
      sagittal: null,
      coronal: null,
      '3d_horizontal': null,
      '3d_vertical': null
    };

    this.videoAvailable = {
      axial: false,
      sagittal: false,
      coronal: false,
      '3d_horizontal': false,
      '3d_vertical': false
    };

    this.slices = {
      axial: Math.floor(caseObj.slices.axial / 2),
      sagittal: Math.floor(caseObj.slices.sagittal / 2),
      coronal: Math.floor(caseObj.slices.coronal / 2)
    };

    this.rot3D = {
      horizontal: 0,
      vertical: 0
    };

    this.initVideoPreload();
  }

  initVideoPreload() {
    const types = ['axial', 'sagittal', 'coronal', '3d_horizontal', '3d_vertical'];
    
    types.forEach(type => {
      const path = this.caseObj.videoPaths ? this.caseObj.videoPaths[type] : null;
      if (!path) return;

      const video = document.createElement('video');
      video.src = path;
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.webkitPlaysInline = true;

      video.addEventListener('loadedmetadata', () => {
        this.videoAvailable[type] = true;
        this.videoElements[type] = video;
      });

      video.addEventListener('error', () => {
        this.videoAvailable[type] = false;
      });

      video.load();
    });
  }

  render2D(plane, canvas, sliceIndex) {
    if (sliceIndex !== undefined) {
      this.slices[plane] = sliceIndex;
    }
    const currentSlice = this.slices[plane];
    const totalSlices = this.caseObj.slices[plane];

    const video = this.videoElements[plane];
    if (this.videoAvailable[plane] && video && video.duration) {
      const time = ((currentSlice - 1) / Math.max(1, totalSlices - 1)) * video.duration;
      video.currentTime = time;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      window.SyntheticCanvasRenderer.render2DSlice(canvas, plane, currentSlice, totalSlices, this.caseObj);
    }
  }

  render3D(canvas, rotH, rotV) {
    if (rotH !== undefined) this.rot3D.horizontal = (rotH + 360) % 360;
    if (rotV !== undefined) this.rot3D.vertical = Math.max(-85, Math.min(85, rotV));

    const curH = this.rot3D.horizontal;
    const curV = this.rot3D.vertical;

    const videoH = this.videoElements['3d_horizontal'];
    if (this.videoAvailable['3d_horizontal'] && videoH && videoH.duration) {
      const time = (curH / 360) * videoH.duration;
      videoH.currentTime = time;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoH, 0, 0, canvas.width, canvas.height);
    } else {
      window.SyntheticCanvasRenderer.render3DRotation(canvas, curH, curV, this.caseObj);
    }
  }
};
