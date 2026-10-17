
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : undefined
});

app.use(express.json({ limit: '8kb' }));

app.get('/', (req, res) => {
    res.json({
        code: 1,
        data: { ok: true }
    });
});

app.get('/api/wings', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT user_id, wing_id FROM player_wings'
        );

        res.json({
            code: 1,
            data: {
                ok: true,
                players: result.rows.map(row => ({
                    userId: row.user_id,
                    wingId: row.wing_id
                }))
            }
        });
    } catch (e) {
        console.error('[GET /api/wings]', e);
        res.status(500).json({
            code: 0,
            message: 'Database error',
            data: { ok: false }
        });
    }
});

app.post('/api/wings', async (req, res) => {
    const { userId, wingId } = req.body || {};

    if (
        typeof userId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(userId) ||
        !Number.isInteger(wingId) ||
        wingId < 0
    ) {
        return res.status(400).json({
            code: 0,
            message: 'Invalid userId or wingId',
            data: { ok: false }
        });
    }

    try {
        await pool.query(
            `INSERT INTO player_wings (user_id, wing_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id)
             DO UPDATE SET wing_id = EXCLUDED.wing_id`,
            [userId, wingId]
        );

        res.json({
            code: 1,
            data: { ok: true }
        });
    } catch (e) {
        console.error('[POST /api/wings]', e);
        res.status(500).json({
            code: 0,
            message: 'Database error',
            data: { ok: false }
        });
    }
});

async function start() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS player_wings (
            user_id TEXT PRIMARY KEY,
            wing_id INTEGER NOT NULL
        )
    `);

    const port = process.env.PORT || 10000;

    app.listen(port, '0.0.0.0', () => {
        console.log('Server started on port ' + port);
    });
}

start().catch(e => {
    console.error('Failed to start server:', e);
    process.exit(1);
});
