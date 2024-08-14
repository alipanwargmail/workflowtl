const { Pool } = require('pg')

const poolworkflow = new Pool({
	user: process.env.WORKFLOWUSER,
	host: process.env.WORKFLOWHOST,
	database: process.env.WORKFLOWDATABASE,
	password: process.env.WORKFLOWPASSWORD,
	max: 100,
	port: 5432,
	ssl: false
})

module.exports = poolworkflow