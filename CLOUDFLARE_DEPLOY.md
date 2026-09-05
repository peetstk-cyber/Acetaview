# 🚀 คู่มือการ Deploy AcetaView ขึ้น Cloudflare Pages

โปรเจกต์นี้ได้รับการตั้งค่าไฟล์คอนฟิกสำหรับ **Cloudflare Pages** พร้อมใช้งานเรียบร้อยแล้ว:
- `_headers`: แคชภาพ CT และ 3D (กว่า 6,000 ไฟล์) แบบ Immutable (31536000 วินาที) โหลดเร็วทันที และไม่เปลืองแบนด์วิดท์
- `_redirects`: ระบบ Fallback ให้หน้าเว็บทำงานราบรื่น
- `wrangler.toml`: คอนฟิกมาตรฐานสำหรับ Cloudflare Pages
- `.gitignore`: ป้องกันไฟล์ขยะ (`.DS_Store`, `scratch/`, แคช) ขึ้น Production

---

## วิธีที่ 1: Deploy ผ่าน GitHub (แนะนำที่สุด - ทำงานอัตโนมัติ)

เนื่องจากโปรเจกต์นี้ผูกอยู่กับ GitHub Repository: `peetstk-cyber/Acetaview`

1. **Commit และ Push โค้ดขึ้น GitHub**:
   ```bash
   git add .
   git commit -m "Prepare Cloudflare Pages deployment and update frame counts"
   git push origin main
   ```

2. **เปิดหน้าแดชบอร์ด Cloudflare**:
   - ไปที่ [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - เมนูด้านซ้ายเลือก **Compute (Workers & Pages)** > **Create application**
   - เลือกแท็บ **Pages** > คลิก **Connect to Git**
   - เลือกบัญชี GitHub และเลือก Repository **`Acetaview`**

3. **ตั้งค่า Build Settings**:
   - **Project name**: `acetaview` (หรือตามที่ต้องการ)
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: *(เว้นว่างไว้ ไม่ต้องกรอก)*
   - **Build output directory**: `/` *(หรือใส่จุด `.` หรือเว้นว่าง)*

4. **กดปุ่ม "Save and Deploy"**:
   - Cloudflare จะเริ่ม Build และแจก URL ฟรีระดับ Global Edge (เช่น `acetaview.pages.dev`) ภายในไม่กี่วินาที
   - เมื่อมีการ `git push` ในอนาคต Cloudflare จะอัปเดตเวอร์ชันใหม่ให้อัตโนมัติ

---

## วิธีที่ 2: Deploy ตรงจากเครื่องผ่าน Wrangler CLI

หากต้องการ Deploy ตรงจากเครื่องโดยไม่ต้องผ่าน GitHub:

```bash
# รันคำสั่ง deploy ด้วย npx
npx wrangler pages deploy . --project-name=acetaview
```

*(ระบบจะเปิดหน้า Browser ให้ล็อกอินบัญชี Cloudflare ในครั้งแรก)*
