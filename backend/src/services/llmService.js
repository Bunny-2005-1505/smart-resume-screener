const { Configuration, OpenAIApi } = require('openai');

class LLMService {
    constructor() {
        // LLM_PROVIDER controls which backend is used: 'openai' | 'ollama' | anything else -> mock
        this.provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();

        if (this.provider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            if (apiKey && apiKey !== 'your_openai_api_key_here') {
                const configuration = new Configuration({ apiKey });
                this.openai = new OpenAIApi(configuration);
                this.isEnabled = true;
            } else {
                this.isEnabled = false;
                console.log('LLM_PROVIDER=openai but OPENAI_API_KEY not configured. Using mock scoring.');
            }
        } else if (this.provider === 'ollama') {
            this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
            this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
            this.isEnabled = true;
            console.log(`Using Ollama (local LLM) at ${this.ollamaBaseUrl}, model: ${this.ollamaModel}`);
        } else {
            this.isEnabled = false;
            console.log('No LLM_PROVIDER configured (or set to "mock"). Using mock scoring.');
        }
    }

    buildPrompt(resumeText, jobDescription, candidateInfo, matchDetails) {
        return `
                You are an expert HR recruiter. Analyze this candidate's fit for the job.

                JOB DESCRIPTION:
                ${jobDescription}

                CANDIDATE RESUME:
                ${resumeText}

                CANDIDATE SUMMARY:
                Name: ${candidateInfo.name}
                Email: ${candidateInfo.email}
                Skills: ${candidateInfo.skills.join(', ')}
                Experience: ${candidateInfo.experience.years} years
                Education: ${candidateInfo.education.degree || 'Not specified'}
                Institution: ${candidateInfo.education.institution || 'Not specified'}

                MATCH METRICS:
                Skills Match: ${matchDetails.skillMatchPercentage}%
                Experience Match: ${matchDetails.experienceMatch}%
                Education Match: ${matchDetails.educationMatch}%

                Please provide:
                1. Match Score (1-10):
                2. Justification (2-3 sentences explaining the score):
                3. Key Strengths (3 bullet points):
                4. Key Gaps (3 bullet points):
                5. Recommendation (Hire/Interview/Reject):
            `;
    }

    async getMatchScore(resumeText, jobDescription, candidateInfo, matchDetails) {
        try {
            if (!this.isEnabled) {
                return this.generateMockAnalysis(candidateInfo, matchDetails);
            }

            const prompt = this.buildPrompt(resumeText, jobDescription, candidateInfo, matchDetails);
            let analysis;

            if (this.provider === 'openai') {
                const response = await this.openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert HR recruiter with years of experience in technical hiring. Be honest, detailed, and constructive in your feedback."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                });
                analysis = response.data.choices[0].message.content;
            } else if (this.provider === 'ollama') {
                analysis = await this.callOllama(prompt);
            }

            return this.parseLLMResponse(analysis);
        } catch (error) {
            console.error('LLM Error:', error.message);
            return this.generateMockAnalysis(candidateInfo, matchDetails);
        }
    }

    async callOllama(prompt) {
        // Requires Ollama running locally: https://ollama.com
        // e.g. `ollama pull llama3` then it serves automatically on http://localhost:11434
        const res = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.ollamaModel,
                prompt: `You are an expert HR recruiter with years of experience in technical hiring. Be honest, detailed, and constructive.\n\n${prompt}`,
                stream: false,
                options: { temperature: 0.7 }
            })
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Ollama request failed (${res.status}): ${text}`);
        }

        const data = await res.json();
        return data.response;
    }

    parseLLMResponse(response) {
        const result = {
            score: 5,
            justification: '',
            strengths: [],
            gaps: [],
            recommendation: 'Review'
        };

        const scoreMatch = response.match(/Match Score.*?(\d+)/i);
        if (scoreMatch) result.score = Math.min(10, Math.max(1, parseInt(scoreMatch[1])));

        const justificationMatch = response.match(/Justification.*?([\s\S]*?)(?=Key Strengths|$)/i);
        if (justificationMatch) {
            result.justification = justificationMatch[1].trim();
        }

        const strengthsMatch = response.match(/Key Strengths.*?([\s\S]*?)(?=Key Gaps|$)/i);
        if (strengthsMatch) {
            result.strengths = strengthsMatch[1]
                .split('\n')
                .filter(line => line.trim().match(/^[•\-*]\s*/))
                .map(line => line.replace(/^[•\-*]\s*/, '').trim())
                .filter(line => line.length > 0);
        }

        const gapsMatch = response.match(/Key Gaps.*?([\s\S]*?)(?=Recommendation|$)/i);
        if (gapsMatch) {
            result.gaps = gapsMatch[1]
                .split('\n')
                .filter(line => line.trim().match(/^[•\-*]\s*/))
                .map(line => line.replace(/^[•\-*]\s*/, '').trim())
                .filter(line => line.length > 0);
        }

        const recMatch = response.match(/Recommendation.*?(Hire|Interview|Reject)/i);
        if (recMatch) result.recommendation = recMatch[1];

        return result;
    }

    generateMockAnalysis(candidateInfo, matchDetails) {
        const skillCount = candidateInfo.skills?.length || 0;
        const years = candidateInfo.experience?.years || 0;
        const hasEducation = candidateInfo.education?.degree ? true : false;

        let score = 5;
        let strengths = [];
        let gaps = [];

        if (matchDetails.skillMatchPercentage >= 70) {
            score += 1.5;
            strengths.push(`Strong skills alignment (${matchDetails.skillMatchPercentage}% match)`);
        } else if (matchDetails.skillMatchPercentage >= 50) {
            score += 0.5;
            strengths.push(`Moderate skills match (${matchDetails.skillMatchPercentage}%)`);
        } else {
            gaps.push(`Skills mismatch - only ${matchDetails.skillMatchPercentage}% match`);
        }

        if (matchDetails.experienceMatch >= 80) {
            score += 1.5;
            strengths.push(`${years} years of relevant experience`);
        } else if (matchDetails.experienceMatch >= 50) {
            score += 0.5;
        } else {
            gaps.push(`Limited experience (${years} years)`);
        }

        if (matchDetails.educationMatch >= 70) {
            score += 1;
            if (hasEducation) {
                strengths.push(`${candidateInfo.education.degree} in ${candidateInfo.education.institution || 'relevant field'}`);
            }
        } else if (matchDetails.educationMatch >= 40) {
            score += 0.5;
        } else {
            gaps.push('Education requirements not fully met');
        }

        if (skillCount > 0) {
            strengths.push(`Skills: ${candidateInfo.skills.slice(0, 5).join(', ')}${skillCount > 5 ? '...' : ''}`);
        } else {
            gaps.push('No skills identified in resume');
        }

        score = Math.min(10, Math.max(1, Math.round(score)));

        const justification = `Candidate shows ${matchDetails.skillMatchPercentage}% skills match with ${years} years of experience. ${hasEducation ? 'Has educational background.' : 'Education details limited.'} ${score >= 7 ? 'Strong candidate for the role.' : score >= 5 ? 'Adequate candidate with some gaps.' : 'Significant gaps identified.'}`;

        let recommendation = 'Review';
        if (score >= 8) recommendation = 'Hire';
        else if (score >= 6) recommendation = 'Interview';
        else if (score < 4) recommendation = 'Reject';

        return {
            score: score,
            justification: justification,
            strengths: strengths.slice(0, 3),
            gaps: gaps.slice(0, 3),
            recommendation: recommendation
        };
    }
}

module.exports = LLMService;
