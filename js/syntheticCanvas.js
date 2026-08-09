/**
 * Synthetic Canvas Renderer for Acetabulum Research Platform
 * Generates procedural CT slice images & 3D bone reconstructions when MP4 files are absent.
 */

window.SyntheticCanvasRenderer = class SyntheticCanvasRenderer {
  /**
   * Render a 2D CT Slice on a Canvas
   * @param {HTMLCanvasElement} canvas 
   * @param {string} plane - 'axial' | 'sagittal' | 'coronal'
   * @param {number} currentSlice - 1-indexed slice number
   * @param {number} totalSlices - total count
   * @param {Object} caseObj - Case metadata
   */
  static render2DSlice(canvas, plane, currentSlice, totalSlices, caseObj) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width || 512;
    const height = canvas.height || 512;

    // Clear background (Dark CT Gray)
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, width, height);

    // Normalized depth ratio (0.0 to 1.0)
    const t = (currentSlice - 1) / Math.max(1, totalSlices - 1);
    
    // Draw soft tissue outline
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width * 0.4, height * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1c2436';
    ctx.fill();
    ctx.strokeStyle = '#2d3b59';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Pelvic Bone / Acetabulum based on plane & depth t
    ctx.fillStyle = '#e8f0fe';
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 4;

    const centerX = width / 2;
    const centerY = height / 2;

    if (plane === 'axial') {
      const boneRadius = width * (0.15 + 0.1 * Math.sin(t * Math.PI));
      
      // Right & Left Pelvis halves
      ctx.beginPath();
      ctx.arc(centerX - 70, centerY, boneRadius, 0.4, Math.PI * 1.6);
      ctx.arc(centerX - 70, centerY, boneRadius * 0.7, Math.PI * 1.6, 0.4, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX + 70, centerY, boneRadius, Math.PI * 1.4, Math.PI * 0.6, true);
      ctx.arc(centerX + 70, centerY, boneRadius * 0.7, Math.PI * 0.6, Math.PI * 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Femoral Heads
      ctx.fillStyle = '#d0e2ff';
      ctx.beginPath();
      ctx.arc(centerX - 70, centerY, boneRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 70, centerY, boneRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();

    } else if (plane === 'coronal') {
      const heightFactor = Math.sin(t * Math.PI);
      
      ctx.beginPath();
      ctx.ellipse(centerX - 80, centerY - 20, 45, 90 * heightFactor + 10, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX + 80, centerY - 20, 45, 90 * heightFactor + 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cbdcf7';
      ctx.beginPath();
      ctx.arc(centerX - 80, centerY + 30, 35, 0, Math.PI * 2);
      ctx.arc(centerX + 80, centerY + 30, 35, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Sagittal
      ctx.beginPath();
      ctx.arc(centerX, centerY - 20, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 20, 48, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cbdcf7';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 20, 42, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Render Orientation Overlays
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = '#00e5ff';

    if (plane === 'axial') {
      ctx.fillText('A', width / 2 - 5, 25);
      ctx.fillText('P', width / 2 - 5, height - 15);
      ctx.fillText('R', 15, height / 2 + 5);
      ctx.fillText('L', width - 25, height / 2 + 5);
    } else if (plane === 'coronal') {
      ctx.fillText('S', width / 2 - 5, 25);
      ctx.fillText('I', width / 2 - 5, height - 15);
      ctx.fillText('R', 15, height / 2 + 5);
      ctx.fillText('L', width - 25, height / 2 + 5);
    } else {
      ctx.fillText('S', width / 2 - 5, 25);
      ctx.fillText('I', width / 2 - 5, height - 15);
      ctx.fillText('A', 15, height / 2 + 5);
      ctx.fillText('P', width - 25, height / 2 + 5);
    }

    // Windowing Tag
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText(`Slice ${currentSlice}/${totalSlices}`, 15, height - 20);
  }

  /**
   * Render 3D Reconstruction Interactive Bone View on Canvas
   */
  static render3DRotation(canvas, rotH, rotV, caseObj) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width || 600;
    const height = canvas.height || 600;

    const bgGrad = ctx.createRadialGradient(width/2, height/2, 50, width/2, height/2, width*0.7);
    bgGrad.addColorStop(0, '#111827');
    bgGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);

    const radH = (rotH * Math.PI) / 180;
    const radV = (rotV * Math.PI) / 180;

    const scale = 1.3 + 0.2 * Math.sin(radV);
    ctx.scale(scale, scale * (0.8 + 0.2 * Math.cos(radV)));

    const boneGrad = ctx.createLinearGradient(-100, -150, 100, 150);
    boneGrad.addColorStop(0, '#ffffff');
    boneGrad.addColorStop(0.5, '#dbebe6');
    boneGrad.addColorStop(1, '#8ea3a6');

    ctx.shadowColor = 'rgba(0, 229, 255, 0.25)';
    ctx.shadowBlur = 15;

    ctx.fillStyle = boneGrad;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;

    // Right Iliac Wing
    ctx.beginPath();
    ctx.ellipse(-75 * Math.cos(radH), -40 + 20 * Math.sin(radV), 55, 80, radH * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left Iliac Wing
    ctx.beginPath();
    ctx.ellipse(75 * Math.cos(radH), -40 + 20 * Math.sin(radV), 55, 80, -radH * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Acetabulum Socket (Right)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(-70 * Math.cos(radH), 30 + 10 * Math.sin(radV), 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Acetabulum Socket (Left)
    ctx.beginPath();
    ctx.arc(70 * Math.cos(radH), 30 + 10 * Math.sin(radV), 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Femoral Head (Right)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(-70 * Math.cos(radH) + 5 * Math.sin(radH), 30 + 10 * Math.sin(radV), 28, 0, Math.PI * 2);
    ctx.fill();

    // Femoral Head (Left)
    ctx.beginPath();
    ctx.arc(70 * Math.cos(radH) - 5 * Math.sin(radH), 30 + 10 * Math.sin(radV), 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3D Axis Gizmo
    this.drawAxisGizmo(ctx, width, height, rotH, rotV);
  }

  static drawAxisGizmo(ctx, width, height, rotH, rotV) {
    const gx = 50;
    const gy = height - 50;
    const len = 30;
    const radH = (rotH * Math.PI) / 180;
    const radV = (rotV * Math.PI) / 180;

    ctx.save();
    ctx.font = '10px Inter, sans-serif';

    // X axis (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    const xx = gx + len * Math.cos(radH);
    const xy = gy + len * Math.sin(radH) * Math.sin(radV);
    ctx.lineTo(xx, xy);
    ctx.stroke();
    ctx.fillText('X', xx + 4, xy + 4);

    // Y axis (Green)
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    const yx = gx - len * Math.sin(radH);
    const yy = gy + len * Math.cos(radH) * Math.sin(radV);
    ctx.lineTo(yx, yy);
    ctx.stroke();
    ctx.fillText('Y', yx + 4, yy + 4);

    // Z axis (Blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    const zx = gx;
    const zy = gy - len * Math.cos(radV);
    ctx.lineTo(zx, zy);
    ctx.stroke();
    ctx.fillText('Z', zx + 4, zy - 2);

    ctx.restore();
  }
};
