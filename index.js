// index.js
const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');
const sanitize = require('sanitize-filename');

const app = express();
const PORT = process.env.PORT || 3000;

// تأكد من وجود مجلد uploads
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// إعدادات التخزين عبر multer (حفظ في uploads مع اسم آمن)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // تنظيف اسم الملف وإضافة طابع زمني لتجنب التعارض
    const safeName = sanitize(file.originalname);
    const timestamp = Date.now();
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    cb(null, base + '-' + timestamp + ext);
  }
});

// قيود الملف: حجم أقصى وفلتر امتدادات
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: function (req, file, cb) {
    // قائمة امتدادات مسموح بها (تقدر تعدل)
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('امتداد الملف غير مسموح.'));
    }
  }
});

// ملفات ثابتة للواجهة
app.use(express.static(path.join(__dirname, 'public')));

// صفحة رئيسية (يمكن حذفها لأن public/index.html جاهز)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// نقطة رفع ملف واحد باسم الحقل "myfile"
app.post('/upload', upload.single('myfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('لم يتم اختيار ملف.');
  }
  res.send(`
    <p>تم الرفع بنجاح: ${req.file.filename}</p>
    <p><a href="/">ارجع للصفحة</a></p>
    <p><a href="/files">عرض كل الملفات</a></p>
  `);
});

// عرض قائمة الملفات المرفوعة مع روابط للتحميل
app.get('/files', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).send('خطأ في قراءة الملفات.');
    const list = files.map(f => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, f));
      return `<li><a href="/uploads/${encodeURIComponent(f)}" target="_blank">${f}</a> — ${Math.round(stat.size/1024)} KB</li>`;
    }).join('\n') || '<li>لا توجد ملفات.</li>';
    res.send(`
      <h2>ملفات مرفوعة</h2>
      <ul>${list}</ul>
      <p><a href="/">العودة</a></p>
    `);
  });
});

// جعل مجلد uploads متاح للتحميل (تنبيه: في بيئة إنتاج خذ احتياطات أمان إضافية)
app.use('/uploads', express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false,
  maxAge: '1h'
}));

// معالجة أخطاء multer
app.use((err, req, res, next) => {
  if (err) {
    res.status(400).send(`<p>خطأ: ${err.message}</p><p><a href="/">العودة</a></p>`);
  } else next();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
