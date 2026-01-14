// App initialization
window.initApp = function() {
    console.log('initApp called');
    console.log('window.__LECTURE_DATA__:', window.__LECTURE_DATA__);
    
    // Use empty object if data not available - sections will show placeholders
    const data = window.__LECTURE_DATA__ || {};
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderAll(data);
        });
    } else {
        // DOM already ready, but wait a tick to ensure all elements exist
        setTimeout(() => {
            renderAll(data);
        }, 10);
    }
};

function renderAll(data) {
    console.log('renderAll called with data:', data);
    
    // Render all sections (they handle missing data with placeholders)
    renderBreadcrumbs(data);
    renderHero(data);
    renderVideo(data);
    renderCheckpoint(data);
    renderNotes(data);
    renderDiagram(data);
    renderQuiz(data);
    renderWrapUp(data);
    
    // Initialize interactivity
    initProgressBar();
    initMiniNav();
    initSmoothScroll();
    initCollapsibleCards();
    
    // Initialize quiz - use setTimeout to ensure DOM is fully updated
    setTimeout(() => {
        initQuiz();
    }, 100);
    
    initVideoControls();
}

// Render breadcrumbs
function renderBreadcrumbs(data) {
    const container = document.querySelector('[data-slot="breadcrumbs"]');
    if (!container || !data.course) return;
    
    const breadcrumbs = data.course.pathBreadcrumbs || [];
    const html = breadcrumbs.map((crumb, index) => {
        if (index === breadcrumbs.length - 1) {
            return `<span>${crumb}</span>`;
        }
        return `<a href="#">${crumb}</a> <span>></span>`;
    }).join(' ');
    
    container.innerHTML = html;
}

// Render hero section
function renderHero(data) {
    const titleEl = document.querySelector('[data-slot="lectureTitle"]');
    if (titleEl && data.lecture) {
        titleEl.textContent = data.lecture.title;
        document.title = data.lecture.title;
    }
    
    const ratingEl = document.querySelector('[data-slot="rating"]');
    if (ratingEl && data.lecture) {
        const rating = data.lecture.rating || 0;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let html = '';
        for (let i = 0; i < fullStars; i++) {
            html += '<svg class="star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        }
        if (hasHalfStar) {
            html += '<svg class="star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#half-star)"/><defs><linearGradient id="half-star"><stop offset="50%" stop-color="#ffd700"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs></svg>';
        }
        for (let i = 0; i < emptyStars; i++) {
            html += '<svg class="star empty" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
        }
        ratingEl.innerHTML = html;
    }
    
    const infoEl = document.querySelector('[data-slot="lectureInfo"]');
    if (infoEl && data.lecture) {
        const lectureNum = data.lecture.number || 1;
        const totalLectures = data.lecture.totalLectures || 1;
        infoEl.textContent = `Lecture ${lectureNum} of ${totalLectures}`;
    }
    
    const descEl = document.querySelector('[data-slot="lectureDescription"]');
    if (descEl && data.lecture) {
        descEl.textContent = data.lecture.topic || 'Study concepts that explain how linear regression models and how they work.';
    }
}

// Render video section
function renderVideo(data) {
    const container = document.querySelector('[data-slot="video"]');
    if (!container || !data.video) return;
    
    const videoUrl = data.video.videoUrl || '';
    const posterUrl = data.video.posterUrl || '';
    
    let html = '';
    if (videoUrl) {
        html = `
            <video id="lectureVideo" poster="${posterUrl}" controls>
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } else {
        html = `
            <div class="video-placeholder">
                <div>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px;">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    <div>Linear Regression Visualization</div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Render checkpoint section
function renderCheckpoint(data) {
    const container = document.querySelector('[data-slot="checkpoint"]');
    if (!container) return;
    
    // Extract learning points from notes or use defaults
    const keyTakeaways = data.notes?.keyTakeaways || [
        'Understand the fundamentals of linear regression',
        'Learn how to interpret regression coefficients',
        'Master the least squares method'
    ];
    
    const html = keyTakeaways.map(takeaway => `<li>${takeaway}</li>`).join('');
    container.innerHTML = html;
}

// Render notes section
function renderNotes(data) {
    const container = document.querySelector('[data-slot="notes"]');
    if (!container) return;
    
    let html = '';
    
    // Key Takeaways card - always show, with placeholder if empty
    if (data.notes && data.notes.keyTakeaways && data.notes.keyTakeaways.length > 0) {
        html += `
            <div class="notes-card">
                <div class="notes-card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-yellow);">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <h3>Key Takeaways</h3>
                </div>
                <ul>
                    ${data.notes.keyTakeaways.map(takeaway => `<li>${takeaway}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        // Show placeholder for Key Takeaways
        html += `
            <div class="notes-card">
                <div class="notes-card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-yellow);">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <h3>Key Takeaways</h3>
                </div>
                <div class="placeholder-text">(fill info here)</div>
            </div>
        `;
    }
    
    // Core Concepts cards - always show at least one placeholder if empty
    if (data.notes && data.notes.concepts && data.notes.concepts.length > 0) {
        data.notes.concepts.forEach(concept => {
            html += `
                <div class="notes-card concept-card">
                    <div class="card-header" onclick="toggleCard(this)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-blue);">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <h3>${concept.title}</h3>
                        <svg class="card-toggle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                    <div class="card-content">
                        ${concept.plainExplanation ? `<div class="concept-explanation">${concept.plainExplanation}</div>` : ''}
                        ${concept.bullets && concept.bullets.length > 0 ? `
                            <ul class="concept-bullets">
                                ${concept.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
                            </ul>
                        ` : ''}
                        ${concept.example ? `<div class="concept-example"><strong>Example:</strong> ${concept.example}</div>` : ''}
                        ${concept.whyItMatters ? `<div class="concept-why"><strong>Why it matters:</strong> ${concept.whyItMatters}</div>` : ''}
                    </div>
                </div>
            `;
        });
    } else {
        // Show placeholder for Core Concepts
        html += `
            <div class="notes-card concept-card">
                <div class="card-header" onclick="toggleCard(this)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-blue);">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <h3>Core Concepts</h3>
                    <svg class="card-toggle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="placeholder-text">(fill info here)</div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Render diagram section
function renderDiagram(data) {
    const diagramContainer = document.querySelector('[data-slot="diagram"]');
    const controlsContainer = document.querySelector('[data-slot="diagramControls"]');
    
    if (diagramContainer) {
        diagramContainer.innerHTML = `
            <div class="diagram-placeholder">
                <svg width="400" height="300" viewBox="0 0 400 300" style="max-width: 100%;">
                    <!-- Axes -->
                    <line x1="50" y1="250" x2="350" y2="250" stroke="var(--text-secondary)" stroke-width="2"/>
                    <line x1="50" y1="250" x2="50" y2="50" stroke="var(--text-secondary)" stroke-width="2"/>
                    
                    <!-- Axis labels -->
                    <text x="200" y="280" fill="var(--text-secondary)" text-anchor="middle" font-size="14">Independent Variable (X)</text>
                    <text x="20" y="150" fill="var(--text-secondary)" text-anchor="middle" font-size="14" transform="rotate(-90 20 150)">Dependent Variable (Y)</text>
                    
                    <!-- Data points -->
                    <circle cx="80" cy="220" r="4" fill="var(--accent-yellow)"/>
                    <circle cx="120" cy="200" r="4" fill="var(--accent-yellow)"/>
                    <circle cx="160" cy="180" r="4" fill="var(--accent-yellow)"/>
                    <circle cx="200" cy="160" r="4" fill="var(--accent-yellow)"/>
                    <circle cx="240" cy="140" r="4" fill="var(--accent-yellow)"/>
                    <circle cx="280" cy="120" r="4" fill="var(--accent-yellow)"/>
                    <circle cx="320" cy="100" r="4" fill="var(--accent-yellow)"/>
                    
                    <!-- Regression line -->
                    <line x1="50" y1="240" x2="350" y2="90" stroke="var(--accent-blue)" stroke-width="2"/>
                </svg>
                <div style="margin-top: 16px; color: var(--text-secondary);">Linear Regression</div>
            </div>
        `;
    }
    
    if (controlsContainer && data.diagram && data.diagram.labels) {
        const html = data.diagram.labels.map(label => `
            <div class="control-item">
                <div class="control-label">${label.name}</div>
                <div class="control-desc">${label.desc}</div>
            </div>
        `).join('');
        controlsContainer.innerHTML = html;
    }
    
    const instructionsEl = document.querySelector('[data-slot="tryItInstructions"]');
    if (instructionsEl && data.diagram) {
        instructionsEl.innerHTML = `
            <p><strong>Try it:</strong> ${data.diagram.description || 'Adjust the controls to see how different parameters affect the regression line.'}</p>
        `;
    }
}

// Render quiz section
function renderQuiz(data) {
    console.log('renderQuiz called', data);
    const container = document.querySelector('[data-slot="quiz"]');
    console.log('Quiz container found:', container);
    if (!container) {
        console.error('Quiz container not found - trying alternative selector');
        const altContainer = document.querySelector('.quiz-container');
        console.log('Alternative container:', altContainer);
        if (!altContainer) {
            console.error('No quiz container found at all!');
            return;
        }
        // Use alternative container
        const altContainer2 = altContainer;
        renderQuizIntoContainer(altContainer2, data);
        return;
    }
    renderQuizIntoContainer(container, data);
}

function renderQuizIntoContainer(container, data) {
    console.log('Rendering quiz into container:', container);
    console.log('Container exists:', !!container);
    console.log('Container parent:', container?.parentElement);
    
    // Force visibility
    if (container) {
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.minHeight = '200px';
    }
    
    let html = '';
    
    // Always render quiz, show placeholder if no data
    if (!data || !data.quiz || !data.quiz.question || !data.quiz.options || data.quiz.options.length === 0) {
        // Show placeholder quiz - make it fully functional
        html = `
            <div class="quiz-question">Sample Question: What is the main topic of this lecture? (fill info here)</div>
            <ul class="quiz-options" data-answer-id="B" data-placeholder="true">
                <li class="quiz-option" data-option-id="A">
                    <span class="quiz-option-label">A</span>
                    <span class="quiz-option-text">Option A (fill info here)</span>
                </li>
                <li class="quiz-option" data-option-id="B">
                    <span class="quiz-option-label">B</span>
                    <span class="quiz-option-text">Option B (fill info here)</span>
                </li>
                <li class="quiz-option" data-option-id="C">
                    <span class="quiz-option-label">C</span>
                    <span class="quiz-option-text">Option C (fill info here)</span>
                </li>
                <li class="quiz-option" data-option-id="D">
                    <span class="quiz-option-label">D</span>
                    <span class="quiz-option-text">Option D (fill info here)</span>
                </li>
            </ul>
            <div class="quiz-feedback" id="quizFeedback"></div>
            <div class="quiz-actions">
                <button class="btn-primary" id="submitQuiz">Submit</button>
                <button class="btn-secondary" id="reviewQuizHistory">Review Quiz History</button>
            </div>
        `;
    } else {
        const question = data.quiz.question || '';
        const options = data.quiz.options || [];
        const answerId = data.quiz.answerId || '';
        
        html = `
            <div class="quiz-question">${question}</div>
            <ul class="quiz-options" data-answer-id="${answerId}">
                ${options.map(option => `
                    <li class="quiz-option" data-option-id="${option.id}">
                        <span class="quiz-option-label">${option.id}</span>
                        <span class="quiz-option-text">${option.text}</span>
                    </li>
                `).join('')}
            </ul>
            <div class="quiz-feedback" id="quizFeedback"></div>
            <div class="quiz-actions">
                <button class="btn-primary" id="submitQuiz">Submit</button>
                <button class="btn-secondary" id="reviewQuizHistory">Review Quiz History</button>
            </div>
        `;
    }
    
    if (html) {
        console.log('Setting quiz HTML:', html.substring(0, 100));
        container.innerHTML = html;
        console.log('Quiz HTML set. Container now has:', container.innerHTML.substring(0, 100));
    } else {
        console.error('Quiz HTML is empty');
        // Fallback: show placeholder
        container.innerHTML = `
            <div class="quiz-question">(fill info here)</div>
            <ul class="quiz-options" data-answer-id="">
                <li class="quiz-option" data-option-id="A">
                    <span class="quiz-option-label">A</span>
                    <span class="quiz-option-text">(fill info here)</span>
                </li>
                <li class="quiz-option" data-option-id="B">
                    <span class="quiz-option-label">B</span>
                    <span class="quiz-option-text">(fill info here)</span>
                </li>
            </ul>
            <div class="quiz-feedback" id="quizFeedback"></div>
            <div class="quiz-actions">
                <button class="btn-primary" id="submitQuiz" disabled>Submit</button>
                <button class="btn-secondary" id="reviewQuizHistory">Review Quiz History</button>
            </div>
        `;
    }
}

// Render wrap up section
function renderWrapUp(data) {
    console.log('renderWrapUp called', data);
    const container = document.querySelector('[data-slot="wrapUp"]');
    console.log('Wrap up container found:', container);
    if (!container) {
        console.error('Wrap up container not found - trying alternative selector');
        const altContainer = document.querySelector('.wrapup-container');
        console.log('Alternative container:', altContainer);
        if (!altContainer) {
            console.error('No wrap up container found at all!');
            return;
        }
        renderWrapUpIntoContainer(altContainer, data);
        return;
    }
    renderWrapUpIntoContainer(container, data);
}

function renderWrapUpIntoContainer(container, data) {
    console.log('Rendering wrap up into container:', container);
    console.log('Container exists:', !!container);
    console.log('Container parent:', container?.parentElement);
    
    // Force visibility
    if (container) {
        container.style.display = 'flex';
        container.style.visibility = 'visible';
        container.style.minHeight = '200px';
    }
    
    let html = '';
    
    // Summary section - always show, with placeholder if empty
    if (data && data.wrapUp && data.wrapUp.summaryBullets && data.wrapUp.summaryBullets.length > 0) {
        html += `
            <div class="wrapup-section">
                <h3>Summary</h3>
                <ul>
                    ${data.wrapUp.summaryBullets.map(bullet => `<li>${bullet}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        html += `
            <div class="wrapup-section">
                <h3>Summary</h3>
                <div class="placeholder-text">(fill info here)</div>
            </div>
        `;
    }
    
    // Next Steps section - always show, with placeholder if empty
    if (data && data.wrapUp && data.wrapUp.nextSteps && data.wrapUp.nextSteps.length > 0) {
        html += `
            <div class="wrapup-section">
                <h3>Next Steps</h3>
                <ul>
                    ${data.wrapUp.nextSteps.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        html += `
            <div class="wrapup-section">
                <h3>Next Steps</h3>
                <div class="placeholder-text">(fill info here)</div>
            </div>
        `;
    }
    
    // CTA buttons
    const ctaPrimary = (data && data.wrapUp && data.wrapUp.ctaPrimary) ? data.wrapUp.ctaPrimary : 'Next Lecture';
    const ctaSecondary = (data && data.wrapUp && data.wrapUp.ctaSecondary) ? data.wrapUp.ctaSecondary : 'Review Weak Spots';
    
    html += `
        <div class="wrapup-cta">
            <button class="btn-primary" id="nextLectureBtn">${ctaPrimary}</button>
            <button class="btn-secondary" id="reviewWeakSpotsBtn">${ctaSecondary}</button>
        </div>
    `;
    
    if (html) {
        console.log('Setting wrap up HTML:', html.substring(0, 100));
        container.innerHTML = html;
        console.log('Wrap up HTML set. Container now has:', container.innerHTML.substring(0, 100));
    } else {
        console.error('Wrap up HTML is empty');
        // Fallback: show placeholder
        container.innerHTML = `
            <div class="wrapup-section">
                <h3>Summary</h3>
                <div class="placeholder-text">(fill info here)</div>
            </div>
            <div class="wrapup-section">
                <h3>Next Steps</h3>
                <div class="placeholder-text">(fill info here)</div>
            </div>
            <div class="wrapup-cta">
                <button class="btn-primary" id="nextLectureBtn">Next Lecture</button>
                <button class="btn-secondary" id="reviewWeakSpotsBtn">Review Weak Spots</button>
            </div>
        `;
    }
    
    // Make CTA buttons functional
    const nextLectureBtn = document.getElementById('nextLectureBtn');
    const reviewWeakSpotsBtn = document.getElementById('reviewWeakSpotsBtn');
    
    if (nextLectureBtn) {
        nextLectureBtn.addEventListener('click', () => {
            const currentData = window.__LECTURE_DATA__ || data || {};
            const currentLecture = currentData.lecture?.number || 1;
            const totalLectures = currentData.lecture?.totalLectures || 1;
            if (currentLecture < totalLectures) {
                // Navigate to next lecture (you can customize this URL pattern)
                const nextLectureNum = currentLecture + 1;
                window.location.href = `?lecture=${nextLectureNum}`;
            } else {
                alert('This is the last lecture!');
            }
        });
    }
    
    if (reviewWeakSpotsBtn) {
        reviewWeakSpotsBtn.addEventListener('click', () => {
            // Navigate to review page or show review modal
            // You can customize this behavior
            const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
            const incorrect = quizHistory.filter(attempt => !attempt.isCorrect);
            
            if (incorrect.length === 0) {
                alert('Great job! No weak spots to review.');
            } else {
                alert(`You have ${incorrect.length} incorrect answer(s) to review.`);
                // You can navigate to a review page here
                // window.location.href = '/review';
            }
        });
    }
}

// Initialize progress bar
function initProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;
    
    function updateProgress() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
        progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
    }
    
    window.addEventListener('scroll', updateProgress);
    updateProgress();
}

// Initialize mini navigation
function initMiniNav() {
    const miniNavItems = document.querySelectorAll('.mini-nav-item');
    const sections = document.querySelectorAll('.lecture-section');
    
    if (miniNavItems.length === 0 || sections.length === 0) return;
    
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                const sectionNum = sectionId.replace('section-', '');
                
                miniNavItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('data-section') === sectionNum) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);
    
    sections.forEach(section => observer.observe(section));
    
    // Set initial active state
    if (sections.length > 0) {
        const firstItem = document.querySelector('.mini-nav-item[data-section="0"]');
        if (firstItem) firstItem.classList.add('active');
    }
}

// Initialize smooth scroll and navigation
function initSmoothScroll() {
    const data = window.__LECTURE_DATA__ || {};
    const currentLecture = data.lecture?.number || 1;
    const totalLectures = data.lecture?.totalLectures || 1;
    
    // Navigation arrows (prev/next lecture)
    const prevBtn = document.getElementById('prevLecture');
    const nextBtn = document.getElementById('nextLecture');
    
    if (prevBtn) {
        if (currentLecture > 1) {
            prevBtn.addEventListener('click', () => {
                const prevLectureNum = currentLecture - 1;
                // Navigate to previous lecture (customize URL pattern as needed)
                window.location.href = `?lecture=${prevLectureNum}`;
            });
        } else {
            prevBtn.disabled = true;
            prevBtn.style.opacity = '0.5';
            prevBtn.style.cursor = 'not-allowed';
        }
    }
    
    if (nextBtn) {
        if (currentLecture < totalLectures) {
            nextBtn.addEventListener('click', () => {
                const nextLectureNum = currentLecture + 1;
                // Navigate to next lecture (customize URL pattern as needed)
                window.location.href = `?lecture=${nextLectureNum}`;
            });
        } else {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.5';
            nextBtn.style.cursor = 'not-allowed';
        }
    }
    
    // Section navigation links
    const backToNotes = document.getElementById('backToNotes');
    const nextToQuiz = document.getElementById('nextToQuiz');
    
    if (backToNotes) {
        backToNotes.addEventListener('click', () => {
            document.getElementById('section-2').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    if (nextToQuiz) {
        nextToQuiz.addEventListener('click', () => {
            document.getElementById('section-4').scrollIntoView({ behavior: 'smooth' });
        });
    }
}

// Initialize collapsible cards
function initCollapsibleCards() {
    // Cards are toggled via onclick in the rendered HTML
}

function toggleCard(header) {
    const card = header.closest('.concept-card, .notes-card');
    if (!card) return;
    
    const content = card.querySelector('.card-content');
    const toggle = header.querySelector('.card-toggle');
    
    if (content) {
        content.classList.toggle('collapsed');
        if (toggle) {
            toggle.classList.toggle('collapsed');
        }
    }
}

// Make toggleCard available globally
window.toggleCard = toggleCard;

// Initialize quiz
function initQuiz() {
    // Use event delegation for better reliability
    const quizContainer = document.querySelector('.quiz-container');
    if (!quizContainer) {
        console.warn('Quiz container not found');
        return;
    }
    
    const submitBtn = document.getElementById('submitQuiz');
    const reviewBtn = document.getElementById('reviewQuizHistory');
    const feedbackEl = document.getElementById('quizFeedback');
    
    let selectedOptionId = null;
    let quizSubmitted = false;
    
    // Use event delegation on the container
    quizContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.quiz-option');
        if (!option || quizSubmitted) return;
        
        // Remove selected from all options
        document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected to clicked option
        option.classList.add('selected');
        selectedOptionId = option.getAttribute('data-option-id');
        
        console.log('Option selected:', selectedOptionId);
    });
    
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (submitBtn.disabled) {
                return;
            }
            
            // Get currently selected option
            const selectedOption = document.querySelector('.quiz-option.selected');
            if (!selectedOption) {
                alert('Please select an option first.');
                return;
            }
            
            const currentSelectedId = selectedOption.getAttribute('data-option-id');
            
            if (quizSubmitted) return;
            
            const optionsList = document.querySelector('.quiz-options');
            if (!optionsList) {
                alert('Quiz options not found.');
                return;
            }
            
            const answerId = optionsList.getAttribute('data-answer-id');
            const isPlaceholder = optionsList.getAttribute('data-placeholder') === 'true';
            
            if (!answerId && !isPlaceholder) {
                alert('Quiz data not configured. Please add quiz data to JSON.');
                return;
            }
            
            quizSubmitted = true;
            const isCorrect = currentSelectedId === answerId;
            
            // Update selectedOptionId for consistency
            selectedOptionId = currentSelectedId;
            
            // Show feedback
            if (feedbackEl) {
                feedbackEl.className = `quiz-feedback show ${isCorrect ? 'correct' : 'incorrect'}`;
                let explanationText = '';
                if (isPlaceholder) {
                    explanationText = '<div class="quiz-explanation">This is a placeholder quiz. Add quiz data to your JSON to customize the question and answers.</div>';
                } else if (window.__LECTURE_DATA__?.quiz?.explanation) {
                    explanationText = `<div class="quiz-explanation">${window.__LECTURE_DATA__.quiz.explanation}</div>`;
                }
                feedbackEl.innerHTML = `
                    <div><strong>${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong></div>
                    ${explanationText}
                `;
            }
            
            // Highlight correct and incorrect answers
            const allOptions = document.querySelectorAll('.quiz-option');
            allOptions.forEach(option => {
                const optionId = option.getAttribute('data-option-id');
                option.classList.remove('selected', 'correct', 'incorrect');
                
                if (optionId === answerId) {
                    option.classList.add('correct');
                } else if (optionId === currentSelectedId && !isCorrect) {
                    option.classList.add('incorrect');
                }
            });
            
            // Save attempt to localStorage
            const attempt = {
                question: window.__LECTURE_DATA__?.quiz?.question || 'Placeholder Quiz',
                selectedOption: currentSelectedId,
                correctOption: answerId,
                isCorrect: isCorrect,
                timestamp: new Date().toISOString()
            };
            
            let quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
            quizHistory.push(attempt);
            localStorage.setItem('quizHistory', JSON.stringify(quizHistory));
            
            submitBtn.disabled = true;
        });
    }
    
    if (reviewBtn) {
        reviewBtn.addEventListener('click', () => {
            const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
            if (quizHistory.length === 0) {
                alert('No quiz history found.');
                return;
            }
            
            const historyText = quizHistory.map((attempt, index) => {
                const date = new Date(attempt.timestamp).toLocaleString();
                return `${index + 1}. ${date}: ${attempt.isCorrect ? 'Correct' : 'Incorrect'} (Selected: ${attempt.selectedOption}, Correct: ${attempt.correctOption})`;
            }).join('\n');
            
            alert('Quiz History:\n\n' + historyText);
        });
    }
}

// Initialize video controls
function initVideoControls() {
    const replayVideoBtn = document.getElementById('replayVideo');
    const replayDiagramBtn = document.getElementById('replayDiagram');
    
    if (replayVideoBtn) {
        replayVideoBtn.addEventListener('click', () => {
            const video = document.getElementById('lectureVideo');
            if (video) {
                video.currentTime = 0;
                video.play();
            }
        });
    }
    
    if (replayDiagramBtn) {
        replayDiagramBtn.addEventListener('click', () => {
            // Placeholder for diagram replay animation
            console.log('Replay diagram animation');
        });
    }
}

// Auto-initialize if data is already available
(function() {
    function tryInit() {
        if (window.__LECTURE_DATA__ && window.initApp) {
            window.initApp();
        }
    }
    
    // Try immediately
    tryInit();
    
    // Also try after DOM is ready (in case data loads asynchronously)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    }
    
    // Also try after window loads
    window.addEventListener('load', tryInit);
})();
