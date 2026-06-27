const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingSection = document.getElementById('loading');
const resultsSection = document.getElementById('results');

let selectedFile = null;

fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        selectedFile = this.files[0];
        fileNameDisplay.textContent = "Selected File: " + selectedFile.name;
        analyzeBtn.disabled = false;
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
        selectedFile = e.dataTransfer.files[0];
        fileNameDisplay.textContent = "Selected File: " + selectedFile.name;
        analyzeBtn.disabled = false;
    }
});

analyzeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
        return alert("Please select a file first!");
    }

    analyzeBtn.disabled = true;
    loadingSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');

    const formData = new FormData();
    formData.append('resume', selectedFile);
    formData.append('addSkills', document.getElementById('add-skills').checked);
    formData.append('improveDesc', document.getElementById('improve-desc').checked);
    formData.append('fixFormat', document.getElementById('fix-format').checked);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        analyzeBtn.disabled = false;

        
        let rawAIOutput = data.suggestions;
        let cleanHTML = rawAIOutput.replace(/```html/gi, '').replace(/```/g, '').trim();

        document.getElementById('new-resume-content').innerHTML = cleanHTML;

        
        document.getElementById('download-btn').onclick = function() {
            const resumeContent = document.getElementById('new-resume-content').innerHTML;
            
          
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = resumeContent;
            tempContainer.style.padding = '20px';
            tempContainer.style.background = 'white';
            tempContainer.style.color = 'black';
            tempContainer.style.width = '794px'; 
            
            const opt = {
                margin:       15,
                filename:     'My_AI_Built_Resume.pdf',
                image:        { type: 'jpeg', quality: 1 },
                
                html2canvas:  { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 }, 
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            
            html2pdf().set(opt).from(tempContainer).save();
        };

    } catch (error) {
        console.error("Error:", error);
        alert("Failed to build the resume.");
        loadingSection.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});
