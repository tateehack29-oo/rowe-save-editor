# Pokémon R.O.W.E. Thai Save Editor — v0.7

โค้ดเว็บฉบับเต็มสำหรับ ROM ภาษาไทย TH Nonplae ที่ใช้พัฒนาโปรเจกต์นี้
เป็นเว็บ static HTML/CSS/JavaScript ไม่ต้อง npm install หรือ build และประมวลผลเซฟในเบราว์เซอร์

## ฟังก์ชัน

- แก้ชื่อผู้เล่น เงิน และจำนวนไอเทมที่รองรับ
- ดู Party/PC พร้อมภาพ และเพิ่มโปเกมอนลงช่องว่าง
- ค้นหาโปเกมอนและฟอร์มต่าง ๆ ตามข้อมูล ROM ที่รองรับ
- แก้ชื่อ เพศ นิสัย Ability ไอเทมถือ Moves เลเวล 1–100 และ EV/Stats ในแผงเดียว
- พิมพ์ชื่อไอเทม/ท่าเพื่อแสดงตัวเลือกที่มีข้อความตรงกันทันที
- ROM นี้ไม่มี IV รายตัวให้แก้; Stats ใช้ระบบโบนัสของเกม

## ไฟล์ในโปรเจกต์

- `dist/` — เว็บพร้อมใช้งาน รวมโมดูล รูปโปเกมอน และ mon-templates.bin (ต้องอัปโหลดครบ)
- `scripts/` — สคริปต์สกัดข้อมูลและสร้างเทมเพลตจาก ROM ที่ตรงกัน
- `tests/` — ชุดทดสอบโค้ด
- `.github/workflows/pages.yml` — เผยแพร่ dist/ ไป GitHub Pages
- `docs/DEVELOPMENT_HISTORY.md` — บันทึกพัฒนา รูปแบบเซฟ แหล่งข้อมูล ข้อจำกัดและการทดสอบแต่ละรุ่น (ส่วนแรกเป็นประวัติ v0.1)
- `requirements-research.txt` — dependencies สำหรับสคริปต์วิจัย ไม่จำเป็นสำหรับเปิดเว็บ

## นำขึ้น GitHub และเปิดเว็บ

1. แตก ZIP ก่อน GitHub จะไม่แตก ZIP ที่อัปโหลดให้อัตโนมัติ
2. สร้าง repository แล้วนำไฟล์และโฟลเดอร์ทั้งหมดใน ZIP ไว้ที่ราก repository บน branch `main` เช่น `dist/index.html` และ `.github/workflows/pages.yml` อย่าซ้อนไว้ในโฟลเดอร์เพิ่มอีกชั้น
3. ไป Settings → Pages → Build and deployment → Source เลือก **GitHub Actions**
4. ไป Actions → Deploy website to GitHub Pages → Run workflow เลือก main แล้วรอสำเร็จ (หลังตั้งค่าแล้ว push ครั้งถัดไปจะทำงานอัตโนมัติ)
5. เปิด URL ที่แสดงใน Settings → Pages หรือผล deployment

ถ้าใช้ชื่อ branch อื่น ให้แก้ `branches: [main]` ใน workflow ให้ตรงกัน
GitHub Free ใช้ Pages กับ public repository ได้; private repository ขึ้นกับแพ็กเกจ GitHub
การเผยแพร่ด้วย Pages ใช้การเข้าถึงของ GitHub เอง ไม่ได้สืบทอดสิทธิ์ส่วนตัวจากเว็บเดิมใน ChatGPT
บน iPhone สามารถแตะ ZIP ในแอป Files เพื่อแตกไฟล์ แต่ ZIP เพียงไฟล์เดียวใน repository ยังไม่ใช่เว็บที่พร้อมเผยแพร่
หากการอัปโหลดโฟลเดอร์บนมือถือไม่สะดวก ควรใช้ Git client ที่รองรับการนำเข้าโฟลเดอร์

เอกสาร GitHub ที่ใช้อ้างอิง:
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## เปิดบนเครื่องสำหรับพัฒนา

จากโฟลเดอร์โปรเจกต์:

```sh
python3 -m http.server 8000 --directory dist
```

เปิด http://localhost:8000 (อย่าเปิด index.html ด้วย file:// เพราะเว็บโหลดโมดูลและไฟล์ข้อมูลผ่าน fetch)
บนโฮสต์จริงให้ใช้ HTTPS เพื่อให้ SHA-256 ผ่าน Web Crypto ทำงานได้

## ทดสอบ

ใช้ Node.js รุ่นที่รองรับ ES modules:

```sh
node tests/core.test.mjs
node tests/fields.test.mjs /path/to/matching-save.sav
node tests/level.test.mjs /path/to/matching-save.sav
```

ชุดทดสอบที่ใช้เซฟจริงต้องจัดหาเซฟที่ตรงกับ ROM เอง บางชุดอ้างอิงค่าของตัวอย่างที่ใช้พัฒนา
การตรวจไฟล์และโค้ดไม่แทนการทดลองโหลดและเล่นในเกม

## ข้อจำกัดและข้อมูลประกอบ

ออกแบบสำหรับ ROM SHA-256:
`2d1adf301d051f2cc956855c44c3931b35ddee1e3a0a586f5f324fe5064bbcf5`

ไม่มีไฟล์ ROM หรือเซฟส่วนตัวในชุดนี้ เว็บมีข้อมูลที่สร้างไว้แล้ว จึงไม่ต้องมี ROM เพื่อเปิดเว็บ
สำรองเซฟต้นฉบับก่อนแก้ ชื่อใหม่รองรับอักษรอังกฤษ/ตัวเลข; ชื่อไทยเดิมคงเดิมถ้าไม่แก้
การเปลี่ยนเลเวลไม่ทำให้วิวัฒนาการหรือเรียนท่าอัตโนมัติ และ Stats ยังเคารพ Level Cap ของเซฟ
ท่าที่เปลี่ยนใน Party เริ่มด้วย 1 PP ให้รักษาที่ Pokémon Center เพื่อเติม PP
รายละเอียดฟอร์มที่ยังเพิ่มไม่ได้และเงื่อนไขอื่นอยู่ในบันทึกพัฒนา

ภาพและข้อมูล Pokémon เป็นของเจ้าของสิทธิ์เดิม ภาพเสริมบางส่วนมาจาก PokeAPI/sprites:
https://github.com/PokeAPI/sprites
โปรเจกต์นี้ไม่ได้เกี่ยวข้องอย่างเป็นทางการกับเจ้าของ Pokémon

Source snapshot: d1d25038db538fb65803fdfa4ef48ecf06e9f5f0
โค้ดเว็บใน dist/ ตรงกับรุ่น 0.7 ที่เผยแพร่; ชุดส่งออกเพิ่มคู่มือและ workflow สำหรับ GitHub เท่านั้น
