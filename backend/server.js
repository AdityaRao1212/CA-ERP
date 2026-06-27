const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const dbPath = path.join(__dirname, '..', 'database', 'tickets.db');
const sessions = {};

let prisma = null;
try {
  prisma = require('./prismaClient');
  if (prisma) {
    prisma.$connect()
      .then(() => console.log('Prisma connected (optional)'))
      .catch((e) => console.warn('Prisma connect failed', e.message));
  }
} catch (e) {
  console.warn('Prisma loader error:', e.message);
}

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
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
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      avatarColor TEXT NOT NULL,
      initials TEXT NOT NULL,
      l2UserId INTEGER,
      photoName TEXT,
      photoType TEXT,
      photoData TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticketNumber TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      project TEXT,
      assignedToId INTEGER,
      createdById INTEGER NOT NULL,
      dueDate TEXT,
      assignmentPdfName TEXT,
      assignmentPdfType TEXT,
      assignmentPdfData TEXT,
      startedAt TEXT,
      resolvedAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run('ALTER TABLE tickets ADD COLUMN project TEXT', (alterErr) => {
      if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
        console.warn('Unable to add tickets.project column:', alterErr.message);
      }
    });
    db.run('ALTER TABLE tickets ADD COLUMN assignmentPdfName TEXT', (alterErr) => {
      if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
        console.warn('Unable to add tickets.assignmentPdfName column:', alterErr.message);
      }
    });
    db.run('ALTER TABLE tickets ADD COLUMN assignmentPdfType TEXT', (alterErr) => {
      if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
        console.warn('Unable to add tickets.assignmentPdfType column:', alterErr.message);
      }
    });
    db.run('ALTER TABLE tickets ADD COLUMN assignmentPdfData TEXT', (alterErr) => {
      if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
        console.warn('Unable to add tickets.assignmentPdfData column:', alterErr.message);
      }
    });
    db.run('ALTER TABLE users ADD COLUMN l2UserId INTEGER', (alterErr) => {
      if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
        console.warn('Unable to add users.l2UserId column:', alterErr.message);
      }
    });
    db.run('ALTER TABLE users ADD COLUMN photoName TEXT', (alterErr) => {
      if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
        console.warn('Unable to add users.photoName column:', alterErr.message);
      }
    });
    db.run('ALTER TABLE users ADD COLUMN photoType TEXT', (alterErr) => {
      if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
        console.warn('Unable to add users.photoType column:', alterErr.message);
      }
    });
    db.run('ALTER TABLE users ADD COLUMN photoData TEXT', (alterErr) => {
      if (alterErr && !/duplicate column name/i.test(alterErr.message)) {
        console.warn('Unable to add users.photoData column:', alterErr.message);
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      loginAt TEXT NOT NULL,
      logoutAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      title TEXT,
      message TEXT,
      type TEXT,
      ticketId INTEGER,
      ticketNum TEXT,
      fromUserId INTEGER,
      fromName TEXT,
      read INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticketId INTEGER,
      userId INTEGER,
      action TEXT,
      fromValue TEXT,
      toValue TEXT,
      message TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run("UPDATE users SET role = CASE UPPER(role) WHEN 'ADMIN' THEN 'Admin' WHEN 'MANAGER' THEN 'Manager' WHEN 'ANALYST' THEN 'L1' WHEN 'USER' THEN 'L1' WHEN 'L2' THEN 'L2' ELSE role END", (roleErr) => {
      if (roleErr) {
        console.warn('Unable to normalize existing roles:', roleErr.message);
      }
    });

    db.get('SELECT COUNT(*) AS count FROM users', (countErr, userRow) => {
      if (countErr) {
        console.error('Unable to verify user count:', countErr.message);
        return;
      }
      if (userRow.count === 0) {
        const insert = db.prepare(
          'INSERT OR IGNORE INTO users (name, username, email, password, role, department, avatarColor, initials, l2UserId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        insert.run('Alex Johnson', 'alex', 'alex@ca-erp.com', 'password123', 'Admin', 'IT Security', '#6366f1', 'AJ', null);
        insert.run('Sarah Chen', 'sarah', 'sarah@ca-erp.com', 'password123', 'Manager', 'Compliance', '#ec4899', 'SC', null);
        insert.run('Mike Patel', 'mike', 'mike@ca-erp.com', 'password123', 'L1', 'Operations', '#10b981', 'MP', null);
        insert.run('Nina Rao', 'nina', 'nina@ca-erp.com', 'password123', 'L2', 'Review', '#8b5cf6', 'NR', null);
        insert.finalize(() => console.log('Seeded CA-ERP System demo users'));
      }
    });

    db.get('SELECT COUNT(*) AS count FROM tickets', (countErr, row) => {
      if (countErr) {
        console.error('Unable to verify ticket count:', countErr.message);
        return;
      }
      if (row.count === 0) {
        db.all('SELECT id, name FROM users', [], (uErr, rows) => {
          if (uErr) {
            console.error('Unable to load users for ticket seed:', uErr.message);
            return;
          }
          const ids = {};
          rows.forEach((user) => {
            ids[user.name] = user.id;
          });

          const tickets = [
            {
              ticketNumber: 'TKT-001',
              title: 'Unauthorized VPN access attempt detected',
              description: 'Multiple failed VPN login attempts detected in firewall logs. Investigate and block IP.',
              category: 'SECURITY',
              priority: 'URGENT',
              status: 'IN_PROGRESS',
              severity: 'CRITICAL',
              project: 'HDFC',
              assignedToId: ids['Mike Patel'],
              createdById: ids['Alex Johnson'],
              dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
            },
            {
              ticketNumber: 'TKT-002',
              title: 'SSL certificate expiry on customer portal',
              description: 'SSL certificate expires in 5 days. Renew and validate the customer portal certificate.',
              category: 'INFRASTRUCTURE',
              priority: 'HIGH',
              status: 'TODO',
              severity: 'HIGH',
              project: 'ICICI',
              assignedToId: ids['Sarah Chen'],
              createdById: ids['Alex Johnson'],
              dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
            },
            {
              ticketNumber: 'TKT-003',
              title: 'GDPR data subject request overdue',
              description: 'Data subject access request is overdue. Legal team needs immediate action.',
              category: 'COMPLIANCE',
              priority: 'URGENT',
              status: 'IN_REVIEW',
              severity: 'HIGH',
              project: 'SBI',
              assignedToId: ids['Sarah Chen'],
              createdById: ids['Sarah Chen'],
              dueDate: new Date(Date.now() - 2 * 86400000).toISOString(),
            },
            {
              ticketNumber: 'TKT-004',
              title: 'Patch management policy documentation',
              description: 'Create a formal patch management policy covering OS, applications and network devices.',
              category: 'COMPLIANCE',
              priority: 'HIGH',
              status: 'TODO',
              severity: 'MEDIUM',
              project: 'HDFC',
              assignedToId: ids['Mike Patel'],
              createdById: ids['Sarah Chen'],
              dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
            },
            {
              ticketNumber: 'TKT-005',
              title: 'Admin access review on all workstations',
              description: 'Audit local admin rights on workstations and remove unnecessary privileges.',
              category: 'SECURITY',
              priority: 'HIGH',
              status: 'IN_PROGRESS',
              severity: 'HIGH',
              project: 'Axis',
              assignedToId: ids['Alex Johnson'],
              createdById: ids['Mike Patel'],
              dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            },
          ];

          const insertTicket = db.prepare(`INSERT OR IGNORE INTO tickets (ticketNumber, title, description, category, priority, status, severity, project, assignedToId, createdById, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
          tickets.forEach((ticket) => {
            insertTicket.run(
              ticket.ticketNumber,
              ticket.title,
              ticket.description,
              ticket.category,
              ticket.priority,
              ticket.status,
              ticket.severity,
              ticket.project,
              ticket.assignedToId,
              ticket.createdById,
              ticket.dueDate
            );
          });
          insertTicket.finalize(() => console.log('Seeded demo tickets'));
        });
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

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_PROFILE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ROLE_OPTIONS = ['Admin', 'Manager', 'L1', 'L2'];

const normalizeRole = (role) => {
  const raw = String(role || '').trim();
  if (!raw) return 'L1';
  const upper = raw.toUpperCase();
  if (['ADMIN', 'ADMINISTRATOR', 'SUPERADMIN'].includes(upper)) return 'Admin';
  if (['MANAGER', 'SUPERVISOR'].includes(upper)) return 'Manager';
  if (['L2', 'REVIEWER', 'LEAD'].includes(upper)) return 'L2';
  if (['L1', 'ANALYST', 'USER', 'OPERATOR', 'EMPLOYEE'].includes(upper)) return 'L1';
  return raw;
};

const authorize = (...allowedRoles) => (req, res, next) => {
  const normalizedRole = normalizeRole(req.user?.role);
  if (!allowedRoles.map(normalizeRole).includes(normalizedRole)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  req.user.role = normalizedRole;
  next();
};

const getAttachmentSizeBytes = (attachmentData) => {
  if (!attachmentData) return 0;
  const base64Payload = attachmentData.includes(',') ? attachmentData.split(',')[1] : attachmentData;
  return Buffer.from(base64Payload, 'base64').length;
};

const resolveUserId = (payload, callback) => {
  const { assignedToId, assignedToName, assignedToUsername, assignedToEmail } = payload;
  if (assignedToId) {
    return callback(null, Number(assignedToId));
  }

  const search = assignedToName || assignedToUsername || assignedToEmail;
  if (!search) {
    return callback(null, null);
  }

  db.get(
    'SELECT id FROM users WHERE name = ? OR username = ? OR email = ?',
    [search, search, search],
    (err, row) => {
      if (err) return callback(err);
      if (!row) {
        return callback(new Error('Assigned user not found'));
      }
      callback(null, row.id);
    }
  );
};

const fetchTicketDetails = (ticketId, callback) => {
  db.get(
    `SELECT t.*,
      a.id AS assignedToId, a.name AS assignedToName, a.initials AS assignedToInitials, a.avatarColor AS assignedToAvatarColor,
      c.id AS createdById, c.name AS createdByName, c.initials AS createdByInitials, c.avatarColor AS createdByAvatarColor
    FROM tickets t
    LEFT JOIN users a ON t.assignedToId = a.id
    LEFT JOIN users c ON t.createdById = c.id
    WHERE t.id = ?`,
    [ticketId],
    (err, ticket) => {
      if (err) return callback(err);
      if (!ticket) return callback(new Error('Ticket not found after create'));
      callback(null, {
        ...ticket,
        assignedTo: ticket.assignedToId ? {
          id: ticket.assignedToId,
          name: ticket.assignedToName,
          initials: ticket.assignedToInitials,
          avatarColor: ticket.assignedToAvatarColor,
        } : null,
        createdBy: ticket.createdById ? {
          id: ticket.createdById,
          name: ticket.createdByName,
          initials: ticket.createdByInitials,
          avatarColor: ticket.createdByAvatarColor,
        } : null,
      });
    }
  );
};

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT id, name, username, email, role, department, avatarColor, initials, l2UserId, photoName, photoType, photoData FROM users WHERE (username = ? OR email = ?) AND password = ?',
    [username, username, password],
    (err, userRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!userRow) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const normalizedUser = {
        ...userRow,
        role: normalizeRole(userRow.role),
      };

      const token = makeToken();
      sessions[token] = { user: normalizedUser, createdAt: Date.now() };

      const createAttendanceEntry = () => {
        db.get('SELECT id FROM attendance WHERE userId = ? AND logoutAt IS NULL ORDER BY id DESC LIMIT 1', [normalizedUser.id], (attendanceErr, activeRow) => {
          if (attendanceErr) {
            console.warn('Unable to check attendance state:', attendanceErr.message);
            return res.json({ token, user: normalizedUser });
          }
          if (activeRow) {
            return res.json({ token, user: normalizedUser });
          }
          db.run('INSERT INTO attendance (userId, loginAt, createdAt, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [normalizedUser.id, new Date().toISOString()], (insertErr) => {
            if (insertErr) {
              console.warn('Unable to create attendance entry:', insertErr.message);
            }
            res.json({ token, user: normalizedUser });
          });
        });
      };

      createAttendanceEntry();
    }
  );
});

app.get('/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.post('/auth/logout', authenticate, (req, res) => {
  const token = req.headers.authorization.slice(7);
  delete sessions[token];

  db.get('SELECT id FROM attendance WHERE userId = ? AND logoutAt IS NULL ORDER BY id DESC LIMIT 1', [req.user.id], (err, activeRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!activeRow) {
      return res.json({ success: true });
    }
    db.run('UPDATE attendance SET logoutAt = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [new Date().toISOString(), activeRow.id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }
      res.json({ success: true });
    });
  });
});

app.get('/users', authenticate, authorize('Admin', 'Manager', 'L1', 'L2'), (req, res) => {
  db.all(
    `SELECT u.id, u.name, u.email, u.username, u.role, u.department, u.initials, u.avatarColor, u.l2UserId, u.photoName, u.photoType, u.photoData,
            l2.name AS l2Name,
            (SELECT COUNT(*) FROM tickets t WHERE t.assignedToId = u.id AND t.status NOT IN ('DONE', 'CANCELLED')) AS assignedCount
     FROM users u
     LEFT JOIN users l2 ON u.l2UserId = l2.id
     ORDER BY u.name ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/users', authenticate, authorize('Admin'), (req, res) => {
  const { name, username, email, password, role, department, l2UserId, photoName, photoType, photoData } = req.body;
  if (!name || !username || !email || !password || !role || !department) {
    return res.status(400).json({ error: 'Name, username, email, password, role, and department are required' });
  }

  const normalizedRole = normalizeRole(role);
  if (!ROLE_OPTIONS.includes(normalizedRole)) {
    return res.status(400).json({ error: `Role must be one of: ${ROLE_OPTIONS.join(', ')}` });
  }

  if (normalizedRole === 'L1' && !l2UserId) {
    return res.status(400).json({ error: 'L1 users must have an L2 reviewer assigned.' });
  }

  if (normalizedRole === 'L1' && l2UserId) {
    return db.get('SELECT id FROM users WHERE id = ? AND role = ?', [l2UserId, 'L2'], (lookupErr, reviewerRow) => {
      if (lookupErr) return res.status(500).json({ error: lookupErr.message });
      if (!reviewerRow) return res.status(400).json({ error: 'The selected reviewer must be an existing L2 user.' });

      db.run(
        'INSERT INTO users (name, username, email, password, role, department, avatarColor, initials, l2UserId, photoName, photoType, photoData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, username, email, password, normalizedRole, department, '#64748b', name.slice(0, 2).toUpperCase(), Number(l2UserId), photoName || null, photoType || null, photoData || null],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: err.message });
          }
          db.get(
            'SELECT id, name, username, email, role, department, initials, avatarColor, l2UserId FROM users WHERE id = ?',
            [this.lastID],
            (selectErr, userRow) => {
              if (selectErr) return res.status(500).json({ error: selectErr.message });
              res.status(201).json(userRow);
            }
          );
        }
      );
    });
  }

  db.run(
    'INSERT INTO users (name, username, email, password, role, department, avatarColor, initials, l2UserId, photoName, photoType, photoData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, username, email, password, normalizedRole, department, '#64748b', name.slice(0, 2).toUpperCase(), normalizedRole === 'L1' ? Number(l2UserId) : null, photoName || null, photoType || null, photoData || null],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      db.get(
        'SELECT id, name, username, email, role, department, initials, avatarColor, l2UserId FROM users WHERE id = ?',
        [this.lastID],
        (selectErr, userRow) => {
          if (selectErr) return res.status(500).json({ error: selectErr.message });
          res.status(201).json(userRow);
        }
      );
    }
  );
});

app.put('/users/:id', authenticate, authorize('Admin'), (req, res) => {
  const { id } = req.params;
  const { name, username, email, password, role, department, l2UserId, photoName, photoType, photoData } = req.body;

  if (!name || !username || !email || !role || !department) {
    return res.status(400).json({ error: 'Name, username, email, role, and department are required' });
  }

  const normalizedRole = normalizeRole(role);
  if (!ROLE_OPTIONS.includes(normalizedRole)) {
    return res.status(400).json({ error: `Role must be one of: ${ROLE_OPTIONS.join(', ')}` });
  }

  if (normalizedRole === 'L1' && !l2UserId) {
    return res.status(400).json({ error: 'L1 users must have an L2 reviewer assigned.' });
  }

  const updateUser = () => {
    const updates = ['name = ?', 'username = ?', 'email = ?', 'role = ?', 'department = ?', 'l2UserId = ?'];
    const params = [name, username, email, normalizedRole, department, normalizedRole === 'L1' ? Number(l2UserId) : null];

    if (password) {
      updates.splice(3, 0, 'password = ?');
      params.splice(3, 0, password);
    }

    const hasPhoto = photoData && photoName && photoType;
    if (hasPhoto) {
      updates.push('photoName = ?', 'photoType = ?', 'photoData = ?');
      params.push(photoName, photoType, photoData);
    }

    params.push(id);

    db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params,
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        db.get(
          'SELECT id, name, username, email, role, department, initials, avatarColor, l2UserId FROM users WHERE id = ?',
          [id],
          (selectErr, userRow) => {
            if (selectErr) return res.status(500).json({ error: selectErr.message });
            if (!userRow) return res.status(404).json({ error: 'User not found' });
            res.json(userRow);
          }
        );
      }
    );
  };

  if (normalizedRole === 'L1' && l2UserId) {
    return db.get('SELECT id FROM users WHERE id = ? AND role = ?', [l2UserId, 'L2'], (lookupErr, reviewerRow) => {
      if (lookupErr) return res.status(500).json({ error: lookupErr.message });
      if (!reviewerRow) return res.status(400).json({ error: 'The selected reviewer must be an existing L2 user.' });
      updateUser();
    });
  }

  updateUser();
});

app.delete('/users/:id', authenticate, authorize('Admin'), (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  db.get('SELECT id FROM users WHERE id = ?', [id], (err, userRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function (deleteErr) {
      if (deleteErr) return res.status(500).json({ error: deleteErr.message });
      res.json({ success: true });
    });
  });
});

app.get('/tickets', authenticate, authorize('Admin', 'Manager', 'L1', 'L2'), (req, res) => {
  const currentRole = normalizeRole(req.user.role);
  const whereClauses = [];
  const params = [];

  if (currentRole === 'L1' || currentRole === 'L2') {
    whereClauses.push('t.assignedToId = ?');
    params.push(req.user.id);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  db.all(
    `SELECT t.*, 
      a.id AS assignedToId, a.name AS assignedToName, a.initials AS assignedToInitials, a.avatarColor AS assignedToAvatarColor,
      c.id AS createdById, c.name AS createdByName, c.initials AS createdByInitials, c.avatarColor AS createdByAvatarColor
    FROM tickets t
    LEFT JOIN users a ON t.assignedToId = a.id
    LEFT JOIN users c ON t.createdById = c.id
    ${whereSql}
    ORDER BY t.id DESC`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map((ticket) => ({
        ...ticket,
        assignedTo: ticket.assignedToId ? {
          id: ticket.assignedToId,
          name: ticket.assignedToName,
          initials: ticket.assignedToInitials,
          avatarColor: ticket.assignedToAvatarColor,
        } : null,
        createdBy: ticket.createdById ? {
          id: ticket.createdById,
          name: ticket.createdByName,
          initials: ticket.createdByInitials,
          avatarColor: ticket.createdByAvatarColor,
        } : null,
      })));
    }
  );
});

app.post('/tickets', authenticate, authorize('Admin', 'Manager'), (req, res) => {
  const { title, description, category, priority, severity, dueDate, project, attachment, assignedToId } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required' });
  }

  const hasAttachment = attachment?.name && attachment?.type && attachment?.data;
  if (hasAttachment && attachment.type !== 'application/pdf') {
    return res.status(400).json({ error: 'Only PDF attachments are supported' });
  }
  if (hasAttachment && getAttachmentSizeBytes(attachment.data) > MAX_PDF_SIZE_BYTES) {
    return res.status(400).json({ error: 'PDF attachments must be 15 MB or smaller.' });
  }

  resolveUserId(req.body, (resolveErr, assignedId) => {
    if (resolveErr) {
      return res.status(400).json({ error: resolveErr.message });
    }

    db.get('SELECT COUNT(*) AS count FROM tickets', (countErr, row) => {
      if (countErr) return res.status(500).json({ error: countErr.message });
      const ticketNumber = `TKT-${String(row.count + 1).padStart(3, '0')}`;
      const insertSql = hasAttachment
        ? 'INSERT INTO tickets (ticketNumber, title, description, category, priority, status, severity, project, assignedToId, createdById, dueDate, assignmentPdfName, assignmentPdfType, assignmentPdfData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        : 'INSERT INTO tickets (ticketNumber, title, description, category, priority, status, severity, project, assignedToId, createdById, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const insertParams = hasAttachment
        ? [ticketNumber, title, description, category, priority, 'TODO', severity || 'MEDIUM', project || null, assignedId || null, req.user.id, dueDate || null, attachment.name, attachment.type, attachment.data]
        : [ticketNumber, title, description, category, priority, 'TODO', severity || 'MEDIUM', project || null, assignedId || null, req.user.id, dueDate || null];

      db.run(
        insertSql,
        insertParams,
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          fetchTicketDetails(this.lastID, (fetchErr, ticket) => {
            if (fetchErr) return res.status(500).json({ error: fetchErr.message });
            res.status(201).json(ticket);
          });
        }
      );
    });
  });
});

app.patch('/tickets/:id/assign', authenticate, authorize('Admin', 'Manager', 'L1', 'L2'), (req, res) => {
  const { id } = req.params;
  const assignedToId = req.body.assignedToId || null;
  const attachment = req.body.attachment || null;
  const attachmentName = attachment?.name || null;
  const attachmentType = attachment?.type || null;
  const attachmentData = attachment?.data || null;

  db.get('SELECT ticketNumber, assignedToId FROM tickets WHERE id = ?', [id], (err, ticket) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const oldAssignedId = ticket.assignedToId;
    const hasAttachment = attachmentName && attachmentType && attachmentData;
    const currentUserRole = normalizeRole(req.user.role);
    const canReassign = ['Admin', 'Manager'].includes(currentUserRole);
    const assignmentChanged = assignedToId !== oldAssignedId;

    if (hasAttachment && attachmentType !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF attachments are supported' });
    }

    if (!canReassign && assignmentChanged) {
      return res.status(403).json({ error: 'Only admins and managers can reassign tickets.' });
    }

    const updateSql = hasAttachment
      ? 'UPDATE tickets SET assignedToId = ?, assignmentPdfName = ?, assignmentPdfType = ?, assignmentPdfData = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?'
      : 'UPDATE tickets SET assignedToId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
    const updateParams = hasAttachment
      ? [assignedToId, attachmentName, attachmentType, attachmentData, id]
      : [assignedToId, id];

    db.run(updateSql, updateParams, function (updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });

      const notify = (targetId, type, title, message) => {
        if (!targetId) return;
        db.run(
          'INSERT INTO notifications (userId, title, message, type, ticketId, ticketNum, fromUserId, fromName, read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
          [targetId, title, message, type, id, ticket.ticketNumber, req.user.id, req.user.name || req.user.username]
        );
      };

      if (assignedToId && assignedToId !== oldAssignedId) {
        notify(
          assignedToId,
          'ASSIGNED',
          `${ticket.ticketNumber} assigned to you`,
          `${req.user.name || req.user.username} assigned ${ticket.ticketNumber} to you`
        );
      }
      if (oldAssignedId && oldAssignedId !== assignedToId) {
        notify(
          oldAssignedId,
          'REASSIGNED',
          `${ticket.ticketNumber} reassigned`,
          `${req.user.name || req.user.username} reassigned ${ticket.ticketNumber}`
        );
      }

      db.run(
        'INSERT INTO audit_logs (ticketId, userId, action, fromValue, toValue, message, createdAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [id, req.user.id, 'assigned_to', oldAssignedId ? String(oldAssignedId) : null, assignedToId ? String(assignedToId) : null, `${req.user.name || req.user.username} updated assignment`]
      );

      db.get(
        `SELECT t.*, 
          a.id AS assignedToId, a.name AS assignedToName, a.initials AS assignedToInitials, a.avatarColor AS assignedToAvatarColor,
          c.id AS createdById, c.name AS createdByName, c.initials AS createdByInitials, c.avatarColor AS createdByAvatarColor
        FROM tickets t
        LEFT JOIN users a ON t.assignedToId = a.id
        LEFT JOIN users c ON t.createdById = c.id
        WHERE t.id = ?`,
        [id],
        (fetchErr, updated) => {
          if (fetchErr) return res.status(500).json({ error: fetchErr.message });
          res.json({
            ...updated,
            assignedTo: updated.assignedToId ? {
              id: updated.assignedToId,
              name: updated.assignedToName,
              initials: updated.assignedToInitials,
              avatarColor: updated.assignedToAvatarColor,
            } : null,
            createdBy: updated.createdById ? {
              id: updated.createdById,
              name: updated.createdByName,
              initials: updated.createdByInitials,
              avatarColor: updated.createdByAvatarColor,
            } : null,
          });
        }
      );
    });
  });
});

app.patch('/tickets/:id/status', authenticate, authorize('Admin', 'Manager', 'L1', 'L2'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  db.get(
    `SELECT t.*, u.role AS assignedRole, u.l2UserId
     FROM tickets t
     LEFT JOIN users u ON t.assignedToId = u.id
     WHERE t.id = ?`,
    [id],
    (err, ticket) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      const assignedRole = normalizeRole(ticket.assignedRole);
      const fallbackAssignee = status === 'DONE' && assignedRole === 'L1' && ticket.l2UserId ? ticket.l2UserId : ticket.assignedToId;

      db.run(
        'UPDATE tickets SET status = ?, assignedToId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [status, fallbackAssignee, id],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          const notify = (targetId, type, title, message) => {
            if (!targetId) return;
            db.run(
              'INSERT INTO notifications (userId, title, message, type, ticketId, ticketNum, fromUserId, fromName, read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
              [targetId, title, message, type, id, ticket.ticketNumber, req.user.id, req.user.name || req.user.username]
            );
          };

          if (status === 'DONE' && fallbackAssignee && fallbackAssignee !== ticket.assignedToId) {
            notify(
              fallbackAssignee,
              'REVIEW_REQUIRED',
              `${ticket.ticketNumber} moved for review`,
              `${req.user.name || req.user.username} completed ${ticket.ticketNumber} and routed it to the next reviewer.`
            );
          }

          db.get(
            `SELECT t.*, 
              a.id AS assignedToId, a.name AS assignedToName, a.initials AS assignedToInitials, a.avatarColor AS assignedToAvatarColor,
              c.id AS createdById, c.name AS createdByName, c.initials AS createdByInitials, c.avatarColor AS createdByAvatarColor
            FROM tickets t
            LEFT JOIN users a ON t.assignedToId = a.id
            LEFT JOIN users c ON t.createdById = c.id
            WHERE t.id = ?`,
            [id],
            (fetchErr, updated) => {
              if (fetchErr) return res.status(500).json({ error: fetchErr.message });
              res.json({
                ...updated,
                assignedTo: updated.assignedToId ? {
                  id: updated.assignedToId,
                  name: updated.assignedToName,
                  initials: updated.assignedToInitials,
                  avatarColor: updated.assignedToAvatarColor,
                } : null,
                createdBy: updated.createdById ? {
                  id: updated.createdById,
                  name: updated.createdByName,
                  initials: updated.createdByInitials,
                  avatarColor: updated.createdByAvatarColor,
                } : null,
              });
            }
          );
        }
      );
    }
  );
});

app.get('/attendance', authenticate, authorize('Admin', 'Manager'), (req, res) => {
  const range = String(req.query.range || 'all').toLowerCase();
  const targetDate = req.query.date || new Date().toISOString().slice(0, 10);
  const targetMonth = req.query.month || new Date().toISOString().slice(0, 7);
  const targetYear = req.query.year || new Date().getFullYear().toString();
  const userId = req.query.userId ? Number(req.query.userId) : null;

  const clauses = [];
  const params = [];

  if (userId) {
    clauses.push('a.userId = ?');
    params.push(userId);
  }

  if (range === 'daily') {
    clauses.push('(date(a.loginAt) = ? OR date(a.logoutAt) = ?)');
    params.push(targetDate, targetDate);
  } else if (range === 'monthly') {
    clauses.push("(strftime('%Y-%m', a.loginAt) = ? OR strftime('%Y-%m', a.logoutAt) = ?)");
    params.push(targetMonth, targetMonth);
  } else if (range === 'yearly') {
    clauses.push("(strftime('%Y', a.loginAt) = ? OR strftime('%Y', a.logoutAt) = ?)");
    params.push(targetYear, targetYear);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  db.all(
    `SELECT a.id, a.userId, a.loginAt, a.logoutAt, a.createdAt, a.updatedAt,
            u.name AS userName, u.role, u.initials, u.avatarColor
     FROM attendance a
     LEFT JOIN users u ON a.userId = u.id
     ${whereClause}
     ORDER BY a.loginAt DESC`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
