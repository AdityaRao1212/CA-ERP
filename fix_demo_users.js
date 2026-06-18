const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/tickets.db');

db.serialize(() => {
    db.run("UPDATE users SET email='alex@ca-erp.com' WHERE username='alex' AND email='alex@govrisk.com'");
    db.run("UPDATE users SET email='sarah@ca-erp.com' WHERE username='sarah' AND email='sarah@govrisk.com'");
    db.run("UPDATE users SET email='mike@ca-erp.com' WHERE username='mike' AND email='mike@govrisk.com'");
    db.each('SELECT id,name,username,email,role FROM users', (err, row) => {
        if (err) {
            console.error('ERR', err.message);
            return;
        }
        console.log(JSON.stringify(row));
    }, () => db.close());
});
