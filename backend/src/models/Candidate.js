const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/candidates.db');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Create table if not exists
db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        skills TEXT,
        experience_years INTEGER,
        education TEXT,
        match_score REAL,
        match_justification TEXT,
        job_description TEXT,
        match_details TEXT,
        llm_analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

class Candidate {
    static async create(data) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO candidates (
                    name, email, skills, experience_years, education,
                    match_score, match_justification, job_description,
                    match_details, llm_analysis
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                data.name || 'Unknown',
                data.email || 'Not provided',
                JSON.stringify(data.skills || []),
                data.experience?.years || 0,
                data.education?.degree || '',
                data.matchScore || 0,
                data.matchJustification || '',
                data.jobDescription || '',
                JSON.stringify(data.matchDetails || {}),
                JSON.stringify(data.llmAnalysis || {})
            ];
            
            db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...data });
                }
            });
        });
    }

    static async findAll() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM candidates ORDER BY match_score DESC', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        ...row,
                        skills: JSON.parse(row.skills || '[]'),
                        matchDetails: JSON.parse(row.match_details || '{}'),
                        llmAnalysis: JSON.parse(row.llm_analysis || '{}')
                    })));
                }
            });
        });
    }

    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM candidates WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve({
                        ...row,
                        skills: JSON.parse(row.skills || '[]'),
                        matchDetails: JSON.parse(row.match_details || '{}'),
                        llmAnalysis: JSON.parse(row.llm_analysis || '{}')
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }
}

module.exports = { Candidate, db };