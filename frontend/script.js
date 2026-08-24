document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = window.location.origin + '/api';

    // Mode switching
    const modeBtns = document.querySelectorAll('.mode-btn');
    const singleMode = document.getElementById('singleMode');
    const multiMode = document.getElementById('multiMode');

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.mode === 'single') {
                singleMode.classList.add('active');
                multiMode.classList.remove('active');
            } else {
                multiMode.classList.add('active');
                singleMode.classList.remove('active');
            }
        });
    });

    // File upload handlers
    const resumeFile = document.getElementById('resumeFile');
    const fileName = document.getElementById('fileName');
    const multiFiles = document.getElementById('multiResumeFiles');
    const multiFileName = document.getElementById('multiFileName');

    resumeFile.addEventListener('change', () => {
        if (resumeFile.files.length > 0) {
            fileName.textContent = resumeFile.files[0].name;
        } else {
            fileName.textContent = 'No file chosen';
        }
    });

    multiFiles.addEventListener('change', () => {
        if (multiFiles.files.length > 0) {
            multiFileName.textContent = Array.from(multiFiles.files).map(f => f.name).join(', ');
        } else {
            multiFileName.textContent = 'No files chosen';
        }
    });

    // Single candidate analysis
    document.getElementById('analyzeBtn').addEventListener('click', async () => {
        const jobDescription = document.getElementById('jobDescription').value.trim();
        const resumeText = document.getElementById('resumeText').value.trim();
        const resumeFileInput = document.getElementById('resumeFile');
        const candidateName = document.getElementById('candidateName').value.trim();
        const errorDiv = document.getElementById('singleError');
        const btn = document.getElementById('analyzeBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');

        if (!jobDescription || jobDescription.length < 10) {
            errorDiv.textContent = 'Please provide a detailed job description (minimum 10 characters)';
            errorDiv.style.display = 'block';
            return;
        }

        if (!resumeText && !resumeFileInput.files.length) {
            errorDiv.textContent = 'Please provide resume text or upload a resume file';
            errorDiv.style.display = 'block';
            return;
        }

        errorDiv.style.display = 'none';
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';

        const formData = new FormData();
        formData.append('jobDescription', jobDescription);
        if (candidateName) formData.append('candidateName', candidateName);
        
        if (resumeFileInput.files.length) {
            formData.append('resume', resumeFileInput.files[0]);
        } else {
            formData.append('resumeText', resumeText);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/upload-resume`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                displayResult(data.candidate);
                document.getElementById('resultsSection').style.display = 'block';
                document.getElementById('multiResults').style.display = 'none';
                document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                errorDiv.textContent = data.error || 'Failed to process resume';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Network error: ' + error.message;
            errorDiv.style.display = 'block';
        } finally {
            btn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    });

    // Multi candidate analysis
    document.getElementById('multiAnalyzeBtn').addEventListener('click', async () => {
        const jobDescription = document.getElementById('multiJobDescription').value.trim();
        const files = document.getElementById('multiResumeFiles').files;
        const errorDiv = document.getElementById('multiError');
        const btn = document.getElementById('multiAnalyzeBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');

        if (!jobDescription || jobDescription.length < 10) {
            errorDiv.textContent = 'Please provide a detailed job description (minimum 10 characters)';
            errorDiv.style.display = 'block';
            return;
        }

        if (!files.length) {
            errorDiv.textContent = 'Please upload at least one resume file';
            errorDiv.style.display = 'block';
            return;
        }

        errorDiv.style.display = 'none';
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';

        const results = [];

        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append('jobDescription', jobDescription);
            formData.append('resume', files[i]);

            try {
                const response = await fetch(`${API_BASE_URL}/upload-resume`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (data.success) {
                    results.push({
                        ...data.candidate,
                        fileName: files[i].name
                    });
                } else {
                    results.push({
                        name: files[i].name,
                        error: data.error || 'Failed to process',
                        fileName: files[i].name
                    });
                }
            } catch (error) {
                results.push({
                    name: files[i].name,
                    error: 'Network error: ' + error.message,
                    fileName: files[i].name
                });
            }
        }

        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';

        results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        displayMultiResults(results);
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('multiResults').style.display = 'block';
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    function displayResult(candidate) {
        const matchDetails = candidate.matchDetails || {};
        const totalSkills = matchDetails.matchingSkills?.length + matchDetails.missingSkills?.length || 7;
        const matched = matchDetails.matchingSkills?.length || 0;
        const score = candidate.matchScore ? Math.round(candidate.matchScore * 10) : 0;

        document.getElementById('resultName').textContent = candidate.name || 'Unknown';
        document.getElementById('resultEducation').textContent = candidate.education?.degree || 'Education not specified';
        document.getElementById('resultScore').textContent = score;
        
        document.getElementById('resultSummary').textContent = 
            `Matched ${matched} of ${totalSkills} job-relevant skills. Overall compatibility score: ${score}%`;

        const rec = candidate.llmAnalysis?.recommendation || 'Review';
        const badge = document.getElementById('resultBadge');
        const recMap = {
            'Hire': 'Strong shortlist',
            'Interview': 'Interview',
            'Review': 'Review',
            'Reject': 'Reject'
        };
        badge.textContent = recMap[rec] || 'Review';
        badge.className = 'rec-badge ' + rec.toLowerCase();

        document.getElementById('resultDetails').textContent = 
            `Experience: ${candidate.experience?.years || 'Not clearly specified'} years · ${candidate.education?.degree || 'No degree'} detected`;

        const matchedSignals = matchDetails.matchingSkills || [];
        const matchedContainer = document.getElementById('matchedSignals');
        matchedContainer.innerHTML = matchedSignals.length ? 
            matchedSignals.map(s => `<span class="signal-tag match">${s}</span>`).join('') :
            '<span class="signal-tag">No matching skills detected</span>';
        document.getElementById('matchedCount').textContent = matchedSignals.length;

        const gaps = matchDetails.missingSkills || [];
        const gapsContainer = document.getElementById('potentialGaps');
        gapsContainer.innerHTML = gaps.length ? 
            gaps.map(s => `<span class="signal-tag missing">${s}</span>`).join('') :
            '<span class="signal-tag">No gaps detected</span>';
        document.getElementById('gapsCount').textContent = gaps.length;

        const allSkills = candidate.skills || [];
        const inventoryContainer = document.getElementById('resumeInventory');
        inventoryContainer.innerHTML = allSkills.length ? 
            allSkills.map(s => `<span class="signal-tag inventory">${s}</span>`).join('') :
            '<span class="signal-tag">No skills detected</span>';
        document.getElementById('inventoryCount').textContent = allSkills.length;
    }

    function displayMultiResults(results) {
        const container = document.getElementById('rankedList');
        
        let html = '';
        results.forEach((result, index) => {
            if (result.error) {
                html += `
                    <div class="ranked-item" style="border-left: 4px solid #fc8181;">
                        <span class="rank">#${index + 1}</span>
                        <div class="info">
                            <div class="name">${result.fileName || 'Unknown'}</div>
                            <div class="details" style="color:#c53030;">Error: ${result.error}</div>
                        </div>
                        <span class="score">—</span>
                    </div>
                `;
            } else {
                const score = result.matchScore ? Math.round(result.matchScore * 10) : 0;
                const badgeClass = score >= 80 ? 'strong' : score >= 60 ? 'interview' : 'review';
                const badgeText = score >= 80 ? '⭐ Strong' : score >= 60 ? '📋 Interview' : '📝 Review';
                
                html += `
                    <div class="ranked-item" style="border-left: 4px solid ${score >= 80 ? '#38a169' : score >= 60 ? '#dd6b20' : '#3182ce'};">
                        <span class="rank">#${index + 1}</span>
                        <div class="info">
                            <div class="name">${result.name || 'Unknown'}</div>
                            <div class="details">${result.skills?.length || 0} skills • ${result.experience?.years || 0} years exp • <span class="rec-badge ${badgeClass}" style="font-size:0.65rem; padding:0.05rem 0.6rem;">${badgeText}</span></div>
                        </div>
                        <span class="score">${score}%</span>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
    }
});