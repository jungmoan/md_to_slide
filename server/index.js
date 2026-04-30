const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3001;

// DB 초기화
const db = new Database('database.sqlite');

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS docs (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    theme TEXT,
    layout TEXT,
    settings TEXT,
    updatedAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS history (
    historyId TEXT PRIMARY KEY,
    docId TEXT,
    content TEXT,
    theme TEXT,
    layout TEXT,
    savedAt INTEGER,
    FOREIGN KEY(docId) REFERENCES docs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    base64Data TEXT
  );
`);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // 이미지 처리를 위해 한도 증설

// --- API 엔드포인트 ---

// 전체 문서 목록 조회
app.get('/api/docs', (req, res) => {
  const docs = db.prepare('SELECT id, title, theme, layout, updatedAt FROM docs ORDER BY updatedAt DESC').all();
  res.json(docs);
});

// 특정 문서 조회
app.get('/api/docs/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM docs WHERE id = ?').get(req.params.id);
  if (doc) {
    doc.settings = JSON.parse(doc.settings || '{}');
    res.json(doc);
  } else {
    res.status(440).json({ error: 'Document not found' });
  }
});

// 문서 저장 (Put)
app.put('/api/docs/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, theme, layout, settings, updatedAt } = req.body;
  
  const settingsStr = JSON.stringify(settings || {});
  
  const info = db.prepare(`
    INSERT OR REPLACE INTO docs (id, title, content, theme, layout, settings, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, content, theme, layout, settingsStr, updatedAt);
  
  res.json({ success: true, changes: info.changes });
});

// 문서 삭제
app.delete('/api/docs/:id', (req, res) => {
  const info = db.prepare('DELETE FROM docs WHERE id = ?').run(req.params.id);
  res.json({ success: true, changes: info.changes });
});

// 히스토리 저장
app.post('/api/history', (req, res) => {
  const { historyId, docId, content, theme, layout, savedAt } = req.body;
  db.prepare(`
    INSERT INTO history (historyId, docId, content, theme, layout, savedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(historyId, docId, content, theme, layout, savedAt);
  res.json({ success: true });
});

// 히스토리 조회
app.get('/api/history/:docId', (req, res) => {
  const history = db.prepare('SELECT * FROM history WHERE docId = ? ORDER BY savedAt DESC').all(req.params.docId);
  res.json(history);
});

// 이미지 저장
app.post('/api/images', (req, res) => {
  const { id, base64Data } = req.body;
  db.prepare('INSERT OR REPLACE INTO images (id, base64Data) VALUES (?, ?)').run(id, base64Data);
  res.json({ success: true, id });
});

// 이미지 조회
app.get('/api/images/:id', (req, res) => {
  const img = db.prepare('SELECT base64Data FROM images WHERE id = ?').get(req.params.id);
  if (img) {
    res.json({ base64Data: img.base64Data });
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
