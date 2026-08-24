class Matcher {
    static matchCandidate(candidateData, jobDescription) {
        const jobKeywords = this.extractKeywords(jobDescription);
        
        const candidateSkills = candidateData.skills || [];
        const matchingSkills = [];
        const missingSkills = [];

        for (const keyword of jobKeywords) {
            const match = candidateSkills.some(skill => 
                skill.toLowerCase().includes(keyword.toLowerCase()) ||
                keyword.toLowerCase().includes(skill.toLowerCase())
            );
            if (match) {
                matchingSkills.push(keyword);
            } else {
                missingSkills.push(keyword);
            }
        }

        const skillMatchPercentage = jobKeywords.length > 0 
            ? (matchingSkills.length / jobKeywords.length) * 100 
            : 50;

        const experienceMatch = this.matchExperience(
            candidateData.experience?.years || 0,
            jobDescription
        );

        const educationMatch = this.matchEducation(
            candidateData.education,
            jobDescription
        );

        const overallScore = Math.round(
            (skillMatchPercentage * 0.6) + 
            (experienceMatch * 0.25) + 
            (educationMatch * 0.15)
        );

        return {
            overallScore: Math.min(100, overallScore),
            skillMatchPercentage: Math.min(100, Math.round(skillMatchPercentage)),
            experienceMatch: Math.round(experienceMatch),
            educationMatch: Math.round(educationMatch),
            matchingSkills: matchingSkills,
            missingSkills: missingSkills
        };
    }

    static extractKeywords(text) {
        const commonKeywords = [
            'react', 'angular', 'vue', 'node', 'express', 'django', 'flask',
            'python', 'java', 'javascript', 'typescript', 'php', 'ruby',
            'sql', 'mongodb', 'postgresql', 'mysql', 'nosql', 'redis',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
            'git', 'agile', 'scrum', 'devops', 'ci/cd', 'linux', 'unix',
            'html', 'css', 'bootstrap', 'tailwind', 'sass', 'less',
            'api', 'rest', 'graphql', 'microservices', 'serverless',
            'spring', 'springboot', 'c++', 'c#', '.net', 'swift', 'kotlin',
            'machine learning', 'ai', 'data science', 'tensorflow', 'pytorch',
            'pandas', 'numpy', 'scikit-learn', 'hadoop', 'spark'
        ];
        
        const textLower = text.toLowerCase();
        const found = commonKeywords.filter(keyword => 
            textLower.includes(keyword.toLowerCase())
        );
        return [...new Set(found)];
    }

    static matchExperience(candidateYears, jobDescription) {
        const expPatterns = [
            /(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?experience/gi,
            /experience\s*:\s*(\d+)\s*(?:years?|yrs?)/gi,
            /(\d+)\s*\+\s*(?:years?|yrs?)/gi,
            /minimum\s*(\d+)\s*(?:years?|yrs?)/gi
        ];
        
        let requiredYears = 0;
        for (const pattern of expPatterns) {
            const match = jobDescription.match(pattern);
            if (match) {
                const years = parseInt(match[0].match(/\d+/)[0]);
                if (years > 0) {
                    requiredYears = years;
                    break;
                }
            }
        }

        if (requiredYears === 0) return 70;
        if (candidateYears >= requiredYears) return 100;
        return Math.min(100, (candidateYears / requiredYears) * 100);
    }

    static matchEducation(candidateEducation, jobDescription) {
        if (!candidateEducation || !candidateEducation.degree) {
            if (/bachelor|master|phd|mba|degree|education/i.test(jobDescription)) {
                return 40;
            }
            return 60;
        }
        
        const degree = candidateEducation.degree.toLowerCase();
        const educationKeywords = ['bachelor', 'master', 'phd', 'mba', 'bs', 'ms', 'b.sc', 'm.sc'];
        
        for (const keyword of educationKeywords) {
            if (jobDescription.toLowerCase().includes(keyword) && 
                degree.includes(keyword)) {
                return 100;
            }
        }
        
        if (/degree|education|bachelor|master|phd|mba/i.test(jobDescription)) {
            return 60;
        }
        
        return 80;
    }
}

module.exports = Matcher;