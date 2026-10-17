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
    res.json({ ok: true });
});

// получить данные всех игроков
app.get('/api/wings', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT user_id, wing_id FROM player_wings'
        );

        res.json({
            ok: true,
            players: result.rows.map(row => ({
                userId: row.user_id,
                wingId: row.wing_id
            }))
        });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

// отправить новое значение wingId
app.post('/api/wings', async (req, res) => {
    const { userId, wingId } = req.body || {};

    if (
        typeof userId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(userId) ||
        !Number.isInteger(wingId) ||
        wingId < 0
    ) {
        return res.status(400).json({ ok: false });
    }

    try {
        await pool.query(
            `INSERT INTO player_wings (user_id, wing_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id)
             DO UPDATE SET wing_id = EXCLUDED.wing_id`,
            [userId, wingId]
        );

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

async function start() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS player_wings (
            user_id TEXT PRIMARY KEY,
            wing_id INTEGER NOT NULL
        )
    `);

    app.listen(process.env.PORT || 10000, '0.0.0.0', () => {
        console.log('Server started');
    });
}

start().catch(console.error);
