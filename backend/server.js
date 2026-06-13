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

    db.get('SELECT COUNT(*) AS count FROM users', (countErr, userRow) => {
      if (countErr) {
        console.error('Unable to verify user count:', countErr.message);
        return;
      }
      if (userRow.count === 0) {
        const insert = db.prepare(
          'INSERT OR IGNORE INTO users (name, username, email, password, role, department, avatarColor, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        insert.run('Alex Johnson', 'alex', 'alex@ca-erp.com', 'password123', 'ADMIN', 'IT Security', '#6366f1', 'AJ');
        insert.run('Sarah Chen', 'sarah', 'sarah@ca-erp.com', 'password123', 'MANAGER', 'Compliance', '#ec4899', 'SC');
        insert.run('Mike Patel', 'mike', 'mike@ca-erp.com', 'password123', 'ANALYST', 'Operations', '#10b981', 'MP');
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

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
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
    'SELECT id, name, username, email, role, department, avatarColor, initials FROM users WHERE (username = ? OR email = ?) AND password = ?',
    [username, username, password],
    (err, userRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!userRow) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = makeToken();
      sessions[token] = { user: userRow, createdAt: Date.now() };
      res.json({ token, user: userRow });
    }
  );
});

app.get('/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.post('/auth/logout', authenticate, (req, res) => {
  const token = req.headers.authorization.slice(7);
  delete sessions[token];
  res.json({ success: true });
});

app.get('/users', authenticate, authorize('ADMIN', 'MANAGER', 'ANALYST'), (req, res) => {
  db.all(
    `SELECT u.id, u.name, u.email, u.username, u.role, u.department, u.initials, u.avatarColor,
            (SELECT COUNT(*) FROM tickets t WHERE t.assignedToId = u.id AND t.status NOT IN ('DONE', 'CANCELLED')) AS assignedCount
     FROM users u
     ORDER BY u.name ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/tickets', authenticate, authorize('ADMIN', 'MANAGER', 'ANALYST'), (req, res) => {
  db.all(
    `SELECT t.*, 
      a.id AS assignedToId, a.name AS assignedToName, a.initials AS assignedToInitials, a.avatarColor AS assignedToAvatarColor,
      c.id AS createdById, c.name AS createdByName, c.initials AS createdByInitials, c.avatarColor AS createdByAvatarColor
    FROM tickets t
    LEFT JOIN users a ON t.assignedToId = a.id
    LEFT JOIN users c ON t.createdById = c.id
    ORDER BY t.id DESC`,
    [],
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

app.post('/tickets', authenticate, authorize('ADMIN', 'MANAGER'), (req, res) => {
  const { title, description, category, priority, severity, dueDate, project, attachment } = req.body;
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required' });
  }

  const hasAttachment = attachment?.name && attachment?.type && attachment?.data;
  if (hasAttachment && attachment.type !== 'application/pdf') {
    return res.status(400).json({ error: 'Only PDF attachments are supported' });
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

app.patch('/tickets/:id/assign', authenticate, authorize('ADMIN', 'MANAGER'), (req, res) => {
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
    if (hasAttachment && attachmentType !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF attachments are supported' });
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
