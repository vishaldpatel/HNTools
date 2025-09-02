// ==UserScript==
// @name         Sliding Side Panel with Tags
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A dynamic sliding side panel with a tag input field, activated by a floating filter button.
// @author       Vishal Patel
// @include      https://news.ycombinator.com/item?id=*
// @grant        none
// ==/UserScript==

/* INSTRUCTIONS:

    1. Install your favorite UserScripts plugin for your browser. I use Tampermonkey (http://tampermonkey.net).
    2. Open your Tampermonkey Dashboard found in the Tampermonkey menu.
    3. Select the option to create a new script (The "+" sign). This will open up the script editor.
    4. Copy and paste the contents of the script that you're interested in into your script editor.
    5. File -> Save
    6. Refresh your hacker news page to see the script in action!
    
/*

(function() {
    'use strict';

    // This function will dynamically load the necessary CSS styles directly into the document head.
    const loadStyles = () => {
        const head = document.head;

        // Add custom styles for the entire UI, based on a brown pastel theme.
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* Use a friendly, modern font. "Inter" is still a great choice. */
            body {
                font-family: 'Inter', sans-serif;
            }

            /* Custom styles for the panel transition */
            .side-panel {
                transform: translateX(-100%);
                transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                position: fixed;
                top: 0;
                left: 0;
                width: 320px;
                height: 100%;
                background-color: #f7f2eb; /* Soft beige background */
                box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
                z-index: 50;
                padding: 2rem;
                box-sizing: border-box;
            }
            .side-panel.open {
                transform: translateX(0);
            }

            /* Styles for the floating open button */
            .open-panel-btn {
                position: fixed;
                bottom: 1.5rem;
                left: 1.5rem;
                z-index: 30;
                background-color: #a47754; /* Warm brown */
                color: #ffffff;
                padding: 1.25rem;
                border: none;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out;
            }
            .open-panel-btn:hover {
                background-color: #8c6444; /* Slightly darker brown on hover */
                transform: scale(1.05);
            }

            /* Styles for the backdrop */
            .backdrop {
                position: fixed;
                inset: 0;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 40;
            }
            .hidden {
                display: none;
            }

            /* Styles for the tags container and form */
            .panel-content {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
            }

            .form-title {
                font-size: 1.75rem;
                font-weight: 700;
                color: #5d4037; /* Dark brown text */
            }

            .close-btn {
                background: none;
                border: none;
                cursor: pointer;
                color: #a47754;
                transition: color 0.2s ease-in-out;
            }
            .close-btn:hover {
                color: #8c6444;
            }

            .tags-form {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .tags-container {
                display: flex;
                flex-wrap: wrap;
                gap: 0.75rem;
                padding: 0.75rem;
                border: 1px solid #d4c0b3; /* Light, subtle border */
                border-radius: 0.75rem;
                background-color: #fffaf5;
                transition: border-color 0.2s;
            }
            .tags-container:focus-within {
                border-color: #a47754;
            }
            .tags-input {
                flex-grow: 1;
                min-width: 0;
                background-color: transparent;
                outline: none;
                border: none;
                padding: 0;
                color: #5d4037;
            }

            /* Styles for individual tags */
            .tag {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                background-color: #f0e6da; /* Lighter beige for tags */
                color: #8c6444;
                font-size: 0.875rem;
                font-weight: 500;
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
            }
            .tag-close-btn {
                background: none;
                border: none;
                cursor: pointer;
                color: #a47754;
                transition: color 0.2s ease-in-out;
                padding: 0;
            }
            .tag-close-btn:hover {
                color: #5d4037;
            }

            /* Submit button */
            .submit-btn {
                width: 100%;
                background-color: #a47754;
                color: #ffffff;
                font-weight: 700;
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 0.75rem;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
                cursor: pointer;
                transition: background-color 0.2s ease-in-out;
            }
            .submit-btn:hover {
                background-color: #8c6444;
            }

            /* Highlight style for matching text */
            .highlighted-tag {
                background-color: #666666; /* Light gray background */
                padding: 1px 3px;
                border-radius: 3px;
            }
        `;
        head.appendChild(styleElement);
    };

    // This is the main function that creates and sets up the entire application.
    const setupApp = () => {
        // Load styles before creating the UI.
        loadStyles();

        // State for the tags
        let tags = [];

        // Function to filter the rows on the page based on the current tags.
        const filterRows = () => {
            const commtextDivs = document.querySelectorAll('div.commtext');

            // If no tags are present, show all rows and remove any highlights.
            if (tags.length === 0) {
                commtextDivs.forEach(div => {
                    const parentRow = div.closest('tr.comtr');
                    if (parentRow) parentRow.style.display = '';
                    div.innerHTML = div.textContent; // Clear any previous highlighting
                });
                return;
            }

            // Escape special regex characters in the tags to treat them as literal strings.
            const escapedTags = tags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

            // Iterate over each div and check for a match.
            commtextDivs.forEach(div => {
                const parentRow = div.closest('tr.comtr');
                if (!parentRow) return;

                const originalText = div.textContent;
                let allTagsMatch = true;

                // Check if the div's text content contains ALL tags.
                for (const escapedTag of tags) {
                    const tagRegex = new RegExp(escapedTag, 'i');
                    if (!tagRegex.test(originalText)) {
                        allTagsMatch = false;
                        break;
                    }
                }

                if (allTagsMatch) {
                    parentRow.style.display = ''; // Show the row
                    // Highlight each matching tag individually.
                    let highlightedText = originalText;
                    for (const escapedTag of tags) {
                        const tagRegex = new RegExp(escapedTag, 'gi');
                        highlightedText = highlightedText.replace(tagRegex, '<span class="highlighted-tag">$&</span>');
                    }
                    div.innerHTML = highlightedText;
                } else {
                    parentRow.style.display = 'none'; // Hide the row
                    div.innerHTML = originalText; // Clear any previous highlighting
                }
            });
        };

        // --- Function to create and manage the tags input ---
        const createTagsInput = () => {
            const tagsContainer = document.createElement('div');
            tagsContainer.id = 'tags-container';
            tagsContainer.className = 'tags-container';

            const tagInput = document.createElement('input');
            tagInput.type = 'text';
            tagInput.id = 'tag-input';
            tagInput.placeholder = 'Add a tag...';
            tagInput.className = 'tags-input';

            const renderTags = () => {
                const existingTags = tagsContainer.querySelectorAll('.tag');
                existingTags.forEach(tag => tag.remove());

                tags.forEach((tag, index) => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag';

                    const tagText = document.createElement('span');
                    tagText.textContent = tag;

                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'tag-close-btn';
                    closeBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    `;
                    closeBtn.addEventListener('click', () => {
                        tags.splice(index, 1);
                        renderTags();
                        filterRows(); // Call the filter function after a tag is removed
                        tagInput.focus();
                    });

                    tagElement.appendChild(tagText);
                    tagElement.appendChild(closeBtn);
                    tagsContainer.insertBefore(tagElement, tagInput);
                });
            };

            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const value = tagInput.value.trim();
                    if (value && !tags.includes(value)) {
                        tags.push(value);
                        renderTags();
                        filterRows(); // Call the filter function after a tag is added
                        tagInput.value = '';
                    }
                }
            });

            tagsContainer.appendChild(tagInput);
            return { tagsContainer, renderTags };
        };

        // --- Function to create the side panel ---
        const createSidePanel = (tagsInputElements) => {
            const sidePanel = document.createElement('div');
            sidePanel.id = 'side-panel';
            sidePanel.className = 'side-panel';

            const innerPanel = document.createElement('div');
            innerPanel.className = 'panel-content';

            const header = document.createElement('div');
            header.className = 'header';
            const title = document.createElement('h2');
            title.className = 'form-title';
            title.textContent = 'Filters';
            const closeBtn = document.createElement('button');
            closeBtn.id = 'close-panel-btn';
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            `;
            header.appendChild(title);
            header.appendChild(closeBtn);

            const form = document.createElement('form');
            form.className = 'tags-form';
            const tagLabel = document.createElement('label');
            tagLabel.htmlFor = 'tag-input';
            tagLabel.className = 'form-label';
            tagLabel.textContent = 'Tags';
            const tagsDiv = document.createElement('div');
            tagsDiv.appendChild(tagLabel);
            tagsDiv.appendChild(tagsInputElements.tagsContainer);
            form.appendChild(tagsDiv);

            const submitDiv = document.createElement('div');
            submitDiv.className = 'mt-6';
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.className = 'submit-btn';
            submitBtn.textContent = 'Submit';
            submitDiv.appendChild(submitBtn);

            innerPanel.appendChild(header);
            innerPanel.appendChild(form);
            innerPanel.appendChild(submitDiv);
            sidePanel.appendChild(innerPanel);

            return { sidePanel, closeBtn, form };
        };

        const createOpenButton = () => {
            const openPanelBtn = document.createElement('button');
            openPanelBtn.id = 'open-panel-btn';
            openPanelBtn.className = 'open-panel-btn';
            openPanelBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
                </svg>
            `;
            return openPanelBtn;
        };

        const createBackdrop = () => {
            const backdrop = document.createElement('div');
            backdrop.id = 'backdrop';
            backdrop.className = 'backdrop hidden';
            return backdrop;
        };

        const openPanelBtn = createOpenButton();
        const backdrop = createBackdrop();
        const tagsInputElements = createTagsInput();
        const { sidePanel, closeBtn, form } = createSidePanel(tagsInputElements);

        document.body.appendChild(openPanelBtn);
        document.body.appendChild(sidePanel);
        document.body.appendChild(backdrop);

        const openPanel = () => {
            sidePanel.classList.add('open');
            backdrop.classList.remove('hidden');
            tagsInputElements.tagsContainer.querySelector('input').focus();
        };

        const closePanel = () => {
            sidePanel.classList.remove('open');
            backdrop.classList.add('hidden');
        };

        openPanelBtn.addEventListener('click', openPanel);
        closeBtn.addEventListener('click', closePanel);
        backdrop.addEventListener('click', closePanel);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidePanel.classList.contains('open')) {
                closePanel();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Submitted tags:', tags);
        });

        // Initial filtering to ensure all rows are shown when the script first runs.
        filterRows();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupApp);
    } else {
        setupApp();
    }
})();
