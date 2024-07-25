const Database = require('better-sqlite3')
const db = new Database('wallets.db')

db.prepare(
  'CREATE TABLE IF NOT EXISTS wallets (userId TEXT PRIMARY KEY, walletAddress TEXT)'
).run()

module.exports = db
