document.addEventListener('DOMContentLoaded', () => {
    // API Endpoints
    const legacyAllUrl = 'https://erp-legacy-monolith.onrender.com/api/legacy/all';    
    
    const cloudAllUrl = 'https://moderninventoryapi.azurewebsites.net/api/modern/all';
    const cloudSingleBaseUrl = 'https://moderninventoryapi.azurewebsites.net/api/modern/product/';

    // Serverless containers sleep when inactive. This silently wakes both servers 
    // in the background as soon as the page loads so the first click is lightning fast.
    setTimeout(() => {
        fetch(legacyAllUrl + "?warmup=true", { mode: 'no-cors' }).catch(() => {});
        fetch(cloudAllUrl + "?warmup=true", { mode: 'no-cors' }).catch(() => {});
    }, 500);
    
    // Store SKUs dynamically as they are fetched
    let extractedSkus = new Set();

    // JSON Syntax Highlighter
    function syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            if (/^"/.test(match) && /:$/.test(match)) {
                // Key: Color the key Cyan, and make the colon Subdued Silver
                return `<span style="color: #56b6c2; font-weight: bold;">${match.slice(0, -1)}</span><span style="color: #8b949e;">:</span>`;
            } else {
                // Value: Bright White
                return `<span style="color: #ffffff;">${match}</span>`;
            }
        });
    }

    // Master Fetch Function
    async function executeQuery(buttonId, loaderId, timerId, consoleId, url, isLegacy, isSingleItem = false) {
        const btn = document.getElementById(buttonId);
        const loaderDisplay = document.getElementById(loaderId);
        const timerDisplay = document.getElementById(timerId);
        const consoleDisplay = document.getElementById(consoleId);
        
        if (btn) btn.disabled = true;
        
        if (timerDisplay) timerDisplay.style.display = 'none';
        if (loaderDisplay) loaderDisplay.style.display = 'block';
        
        consoleDisplay.innerHTML = "Establishing connection...\n";
        if (timerDisplay) timerDisplay.style.color = "var(--color-primary)"; 
       
        try {
            // Forces the browser to make a true network trip every time
            const bypassCacheUrl = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
            const response = await fetch(bypassCacheUrl, { cache: 'no-store' });
            
            // Check for errors before parsing JSON
            if (!response.ok) {
                // Specific UX for the single item lookup
                if (response.status === 404 && isSingleItem) {
                    if (loaderDisplay) loaderDisplay.style.display = 'none';
                    if (timerDisplay) {
                        timerDisplay.style.display = 'block';
                        timerDisplay.innerText = "Error";
                        timerDisplay.style.color = "#ff4d4d"; 
                    }
                    consoleDisplay.innerHTML = `<span style="color: #ff4d4d; font-weight: bold;">Status: 404 Not Found</span><br><br>`;
                    consoleDisplay.innerHTML += `<span style="color: #a0a0a0; font-family: monospace;">Invalid SKU. Product does not exist in the Azure database.</span>`;
                    return; 
                }
                // Generic error for catalog failures
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (loaderDisplay) loaderDisplay.style.display = 'none';
            if (timerDisplay) {
                timerDisplay.style.display = 'block';
                timerDisplay.innerText = (data.TimeTakenMs || data.timeTakenMs) + "ms";
            }
            
            // Set final timer color
            if (timerDisplay) timerDisplay.style.color = isLegacy ? "#ff4d4d" : "#00cc66"; 
            
            // Success Output
            consoleDisplay.innerHTML = `<span style="color: #00cc66; font-weight: bold;">Status: 200 OK</span><br>`;
            consoleDisplay.innerHTML += `Time Taken (Server): ${data.TimeTakenMs || data.timeTakenMs} ms<br>`;
            
            let items = data.Products || data.products;

            if (data.TotalCount || data.totalCount) {
                consoleDisplay.innerHTML += `Total Count: ${data.TotalCount || data.totalCount}<br><br>`;
                
                // Extract SKUs to build the recommendation buttons
                if (items && Array.isArray(items) && items.length > 0) {
                    for(let i = 0; i < Math.min(2, items.length); i++) {
                        const sku = items[i].Sku || items[i].sku;
                        if (sku) extractedSkus.add(sku);
                    }
                    renderSkuButtons();
                }
            } else {
                consoleDisplay.innerHTML += `<br>`; 
            }

            // Print the FULL beautifully indented JSON payload
            const payload = items || data; 
            const jsonString = JSON.stringify(payload, null, 2);
            const highlightedJson = syntaxHighlight(jsonString);
            
            // Added color so all brackets and commas default to silver
            consoleDisplay.innerHTML += `<pre style="margin: 0; white-space: pre-wrap; color: #8b949e; font-family: monospace; font-size: 1.05em;">${highlightedJson}</pre>`;

        } catch (error) {
            if (loaderDisplay) loaderDisplay.style.display = 'none';
            if (timerDisplay) {
                timerDisplay.style.display = 'block';
                timerDisplay.innerText = "Error";
                timerDisplay.style.color = "#ff4d4d";
            }
            consoleDisplay.innerHTML = `<span style="color: #ff4d4d; font-weight: bold;">ERROR: Connection Failed.</span>\nCheck if API is awake.`;
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // Function to render clickable SKU buttons
    function renderSkuButtons() {
        if (extractedSkus.size === 0) return;
        
        const container = document.getElementById('recommendedSkusContainer');
        const btnSpan = document.getElementById('skuButtonsList');
        const hint = document.getElementById('skuHint');
        
        if(container) container.style.display = 'block';
        if(hint) hint.style.display = 'none';
        
        btnSpan.innerHTML = '';
        extractedSkus.forEach(sku => {
            const btn = document.createElement('button');
            btn.className = 'sku-btn';
            btn.innerText = sku;
            btn.onclick = () => {
                document.getElementById('skuInput').value = sku;
            };
            btnSpan.appendChild(btn);
        });
    }

    // Top Panels
    document.getElementById('btnLegacy')?.addEventListener('click', () => {
        executeQuery('btnLegacy', 'loaderLegacy', 'timerLegacy', 'consoleLegacy', legacyAllUrl, true);
    });

    document.getElementById('btnCloud')?.addEventListener('click', () => {
        executeQuery('btnCloud', 'loaderCloud', 'timerCloud', 'consoleCloud', cloudAllUrl, false);
    });

    document.getElementById('btnRaceBoth')?.addEventListener('click', () => {
        executeQuery('btnRaceBoth', 'loaderLegacy', 'timerLegacy', 'consoleLegacy', legacyAllUrl, true);
        executeQuery('btnRaceBoth', 'loaderCloud', 'timerCloud', 'consoleCloud', cloudAllUrl, false);
    });

    // Bottom Panel: O(1) Cloud Fetch Demonstration
    document.getElementById('btnLookup')?.addEventListener('click', () => {
        const sku = document.getElementById('skuInput').value.trim();
        if (!sku) {
            alert("Please enter a SKU or click a Recommended SKU above!");
            return;
        }
        // Passes TRUE at the end to flag this as the single item lookup for 404 handling
        executeQuery('btnLookup', 'loaderLookup', 'timerLookup', 'consoleLookup', cloudSingleBaseUrl + sku, false, true);
    });
});