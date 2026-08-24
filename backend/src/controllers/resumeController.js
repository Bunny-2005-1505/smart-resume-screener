const ResumeParser = require('../services/resumeParser');
const LLMService = require('../services/llmService');
const Matcher = require('../services/matcher');
const { Candidate } = require('../models/Candidate');
const { upload } = require('../utils/fileHandler');
const fs = require('fs');

exports.uploadResume = (req, res) => {
    upload.single('resume')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ 
                success: false, 
                error: err.message 
            });
        }

        const { jobDescription, resumeText: textInput, candidateName } = req.body;
        
        if (!jobDescription || jobDescription.trim().length < 10) {
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                });
            }
            return res.status(400).json({ 
                success: false, 
                error: 'Job description is required (minimum 10 characters)' 
            });
        }

        if (!req.file && !textInput) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide either a resume file or resume text' 
            });
        }

        try {
            let resumeText;
            if (req.file) {
                resumeText = await ResumeParser.parseResume(req.file.path);
            } else {
                resumeText = textInput;
            }

            const candidateInfo = ResumeParser.extractBasicInfo(resumeText);
            
            if (candidateName) {
                candidateInfo.name = candidateName;
            }

            const matchDetails = await Matcher.matchCandidate(candidateInfo, jobDescription);
            
            const llmService = new LLMService();
            const llmAnalysis = await llmService.getMatchScore(
                resumeText,
                jobDescription,
                candidateInfo,
                matchDetails
            );

            const candidateData = {
                name: candidateInfo.name || 'Unknown Candidate',
                email: candidateInfo.email || 'Not provided',
                skills: candidateInfo.skills || [],
                experience: candidateInfo.experience || { years: 0, details: '' },
                education: candidateInfo.education || { degree: '', institution: '', year: null, details: '' },
                resumeText: resumeText.substring(0, 5000),
                matchScore: llmAnalysis.score || (matchDetails.overallScore / 10),
                matchJustification: llmAnalysis.justification || 'No justification available',
                jobDescription: jobDescription,
                matchDetails: {
                    skillMatchPercentage: matchDetails.skillMatchPercentage || 0,
                    experienceMatch: matchDetails.experienceMatch || 0,
                    educationMatch: matchDetails.educationMatch || 0,
                    matchingSkills: matchDetails.matchingSkills || [],
                    missingSkills: matchDetails.missingSkills || []
                },
                llmAnalysis: {
                    strengths: llmAnalysis.strengths || [],
                    gaps: llmAnalysis.gaps || [],
                    recommendation: llmAnalysis.recommendation || 'Review'
                }
            };

            // Save to SQLite
            let savedCandidate = null;
            try {
                savedCandidate = await Candidate.create(candidateData);
                console.log('✅ Saved to SQLite database');
            } catch (dbError) {
                console.error('Database save error:', dbError.message);
            }

            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                });
            }

            res.json({
                success: true,
                candidate: {
                    ...candidateData,
                    id: savedCandidate?.id || null,
                    matchDetails: matchDetails,
                    llmAnalysis: llmAnalysis
                },
                message: 'Resume processed successfully'
            });

        } catch (error) {
            console.error('Processing error:', error);
            if (req.file) {
                try {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                    });
                } catch (cleanupError) {}
            }
            res.status(500).json({ 
                success: false, 
                error: 'Failed to process resume: ' + error.message 
            });
        }
    });
};

exports.getCandidates = async (req, res) => {
    try {
        const candidates = await Candidate.findAll();
        res.json({ 
            success: true, 
            candidates: candidates 
        });
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch candidates' 
        });
    }
};

exports.getCandidate = async (req, res) => {
    try {
        const { id } = req.params;
        const candidate = await Candidate.findById(id);
        if (!candidate) {
            return res.status(404).json({ 
                success: false, 
                error: 'Candidate not found' 
            });
        }
        res.json({ 
            success: true, 
            candidate: candidate 
        });
    } catch (error) {
        console.error('Error fetching candidate:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch candidate' 
        });
    }
};