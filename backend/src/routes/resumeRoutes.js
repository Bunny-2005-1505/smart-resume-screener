const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');

router.post('/upload-resume', resumeController.uploadResume);
router.get('/candidates', resumeController.getCandidates);
router.get('/candidate/:id', resumeController.getCandidate);

module.exports = router;