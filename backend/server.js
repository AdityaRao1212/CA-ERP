const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const dbPath = path.join(__dirname, '..', 'database', 'risks.db');
const sessions = {};

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at', dbPath);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS risks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      risk_statement TEXT NOT NULL,
      identified TEXT NOT NULL,
      inherent_risk TEXT NOT NULL,
      residual_risk TEXT NOT NULL,
      acceptable_risk TEXT NOT NULL,
      owners TEXT NOT NULL,
      due_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
        return;
      }

      db.get('SELECT COUNT(*) AS count FROM users', (countErr, row) => {
        if (countErr) {
          console.error('Unable to verify initial user count:', countErr.message);
          return;
        }

        if (row.count === 0) {
          const seedUsers = db.prepare(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`);
          seedUsers.run('admin', 'admin123', 'admin');
          seedUsers.run('manager', 'manager123', 'editor');
          seedUsers.run('viewer', 'viewer123', 'viewer');
          seedUsers.finalize();
          console.log('Seeded default users: admin, manager, viewer');
        }
      });
    });

    db.get('SELECT COUNT(*) AS count FROM risks', (countErr, row) => {
      if (countErr) {
        console.error('Unable to verify initial risk count:', countErr.message);
        return;
      }
      if (row.count === 0) {
        const seed = db.prepare(`INSERT INTO risks (category, risk_statement, identified, inherent_risk, residual_risk, acceptable_risk, owners, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        seed.run('Human Resources', 'Insufficient training may impact employee performance.', '01/04/2022', 'High', 'Medium', 'Low', 'HR Team', '21/10/2022');
        seed.run('Compliance', 'Develop a data policy that ensures protection of IP as required in privacy laws and regulation.', '01/05/2021', 'High', 'High', 'Medium', 'Compliance Team', '14/10/2022');
        seed.run('Physical & Environmental Security', 'A policy should be implemented to secure unattended user workstations when away from the office.', '01/01/2020', 'Medium', 'Low', 'Low', 'Security Team', '11/10/2022');
        seed.run('Asset Management', 'There is a lack of control over configuration management of end user systems including desktops, laptops...', '01/03/2022', 'High', 'High', 'Medium', 'IT Team', '17/10/2022');
        seed.run('Operations Security', 'A patch management policy and procedure that have not been developed to ensure that assets...', '01/03/2022', 'Medium', 'Medium', 'Low', 'Operations Team', '12/10/2022');
        seed.run('Operations Security', 'Currently all users possess administrative access on workstations. This should be reviewed.', '01/01/2021', 'High', 'Medium', 'Low', 'Ops Team', '13/10/2022');
        seed.finalize();
      }
    });
  });
});

const makeToken = () => crypto.randomBytes(24).toString('hex');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.slice(7);
  const session = sessions[token];
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = session.user;
  next();
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT id, username, role FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = makeToken();
    sessions[token] = { user, createdAt: Date.now() };

    res.json({ token, user });
  });
});

app.get('/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.post('/auth/logout', authenticate, (req, res) => {
  const token = req.headers.authorization.slice(7);
  delete sessions[token];
  res.json({ success: true });
});

app.get('/risks', authenticate, authorize('admin', 'editor', 'viewer'), (req, res) => {
  db.all('SELECT * FROM risks ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/risks', authenticate, authorize('admin', 'editor'), (req, res) => {
  const {
    category,
    risk_statement,
    identified,
    inherent_risk,
    residual_risk,
    acceptable_risk,
    owners,
    due_date,
  } = req.body;

  const statement = `INSERT INTO risks (category, risk_statement, identified, inherent_risk, residual_risk, acceptable_risk, owners, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [category, risk_statement, identified, inherent_risk, residual_risk, acceptable_risk, owners, due_date];

  db.run(statement, values, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID });
  });
});

app.put('/risks/:id', authenticate, authorize('admin', 'editor'), (req, res) => {
  const { id } = req.params;
  const {
    category,
    risk_statement,
    identified,
    inherent_risk,
    residual_risk,
    acceptable_risk,
    owners,
    due_date,
  } = req.body;

  const statement = `UPDATE risks SET category = ?, risk_statement = ?, identified = ?, inherent_risk = ?, residual_risk = ?, acceptable_risk = ?, owners = ?, due_date = ? WHERE id = ?`;
  const values = [category, risk_statement, identified, inherent_risk, residual_risk, acceptable_risk, owners, due_date, id];

  db.run(statement, values, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ updated: this.changes });
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});