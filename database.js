const { Pool } = require('pg')

const poolreplika = new Pool({
    user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	password: process.env.PGPASSWORD,
	max: 100,
	port: process.env.PGPORT,
	ssl: false
})

module.exports = poolreplika