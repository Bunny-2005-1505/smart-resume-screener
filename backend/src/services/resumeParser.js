const fs = require('fs');
const pdfParse = require('pdf-parse');

class ResumeParser {
    static async parseResume(filePath) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            if (filePath.endsWith('.pdf')) {
                const pdfData = await pdfParse(dataBuffer);
                return pdfData.text;
            } else if (filePath.endsWith('.txt')) {
                return dataBuffer.toString('utf-8');
            }
            throw new Error('Unsupported file format');
        } catch (error) {
            console.error('Error parsing resume:', error);
            throw new Error(`Failed to parse resume: ${error.message}`);
        }
    }

    static extractBasicInfo(text) {
        const info = {
            name: 'Unknown',
            email: 'Not provided',
            skills: [],
            experience: { years: 0, details: '' },
            education: { degree: '', institution: '', year: null, details: '' }
        };

        const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) info.email = emailMatch[0];

        const lines = text.split('\n').filter(line => line.trim().length > 0);
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i].trim();
            if (line.length < 50 && line.split(' ').length >= 2 && line.split(' ').length <= 5) {
                if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(line) || /^[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+/.test(line)) {
                    info.name = line;
                    break;
                }
            }
        }
        
        if (info.name === 'Unknown' && lines.length > 0) {
            const firstLine = lines[0].trim();
            if (firstLine.length < 50) {
                info.name = firstLine;
            }
        }

        const skillKeywords = [
            'javascript', 'python', 'java', 'react', 'node', 'express',
            'mongodb', 'sql', 'mysql', 'postgresql', 'aws', 'docker', 
            'git', 'typescript', 'html', 'css', 'api', 'rest', 'graphql', 
            'vue', 'angular', 'php', 'ruby', 'c++', 'c#', 'swift', 
            'kotlin', 'flutter', 'django', 'flask', 'spring', 'springboot',
            'kubernetes', 'jenkins', 'agile', 'scrum', 'devops', 'ci/cd',
            'bootstrap', 'tailwind', 'sass', 'less', 'jquery', 'ajax',
            'json', 'xml', 'oauth', 'jwt', 'redis', 'elasticsearch',
            'kafka', 'rabbitmq', 'nginx', 'apache', 'linux', 'unix',
            'machine learning', 'artificial intelligence', 'data science',
            'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn'
        ];
        
        const textLower = text.toLowerCase();
        const foundSkills = skillKeywords.filter(skill => 
            textLower.includes(skill.toLowerCase())
        );
        info.skills = [...new Set(foundSkills)];

        const expPatterns = [
            /(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?experience/gi,
            /experience\s*:\s*(\d+)\s*(?:years?|yrs?)/gi,
            /(\d+)\s*\+\s*(?:years?|yrs?)/gi
        ];
        
        for (const pattern of expPatterns) {
            const match = text.match(pattern);
            if (match) {
                const years = parseInt(match[0].match(/\d+/)[0]);
                if (years > 0) {
                    info.experience.years = years;
                    break;
                }
            }
        }

        const eduPatterns = [
            /(?:bachelor|master|phd|mba|bs|ms|b\.?s\.?|m\.?s\.?)/i,
            /university|college|institute|school|academy/i
        ];
        
        const sentences = text.split(/[.!?]+/);
        for (const sentence of sentences) {
            if (eduPatterns.some(pattern => pattern.test(sentence))) {
                const cleanSentence = sentence.trim();
                if (cleanSentence.length > 10 && cleanSentence.length < 300) {
                    info.education.details = cleanSentence;
                    const degreeMatch = cleanSentence.match(/(?:bachelor|master|phd|mba|bs|ms)[^\s,.]*/i);
                    if (degreeMatch) info.education.degree = degreeMatch[0].toUpperCase();
                    const institutionMatch = cleanSentence.match(/(?:university|college|institute|school|academy)\s+of\s+[A-Z][a-z]+|at\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i);
                    if (institutionMatch) info.education.institution = institutionMatch[0];
                    break;
                }
            }
        }

        return info;
    }
}

module.exports = ResumeParser;