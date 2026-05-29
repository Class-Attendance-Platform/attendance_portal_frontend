const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.prepare('CREATE TABLE test (id TEXT PRIMARY KEY, val TEXT)').run();
db.prepare('INSERT INTO test (id, val) VALUES (?, ?)').run('1', 'hello');
const row = db.prepare('SELECT * FROM test').get();
console.log('Result:', row);
