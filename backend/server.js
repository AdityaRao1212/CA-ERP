const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

// Database setup
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.serialize(() => {
      db.run(`CREATE TABLE columns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        order_index INTEGER NOT NULL
      )`);

      db.run(`CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        column_id INTEGER NOT NULL,
        FOREIGN KEY (column_id) REFERENCES columns (id)
      )`);
    });
  }
});

// Routes
app.get('/columns', (req, res) => {
  db.all('SELECT * FROM columns ORDER BY order_index', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/columns', (req, res) => {
  const { name, order_index } = req.body;
  db.run('INSERT INTO columns (name, order_index) VALUES (?, ?)', [name, order_index], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});

app.get('/tasks', (req, res) => {
  db.all('SELECT * FROM tasks', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/tasks', (req, res) => {
  const { title, description, column_id } = req.body;
  db.run('INSERT INTO tasks (title, description, column_id) VALUES (?, ?, ?)', [title, description, column_id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});

app.put('/tasks/:id', (req, res) => {
  const { title, description, column_id } = req.body;
  const { id } = req.params;
  db.run('UPDATE tasks SET title = ?, description = ?, column_id = ? WHERE id = ?', [title, description, column_id, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ updated: this.changes });
    }
  });
});

app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tasks WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Employee Management System API!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
