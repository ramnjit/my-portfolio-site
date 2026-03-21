document.addEventListener('DOMContentLoaded', () => {
    const BASE_URL = 'https://roman-claims-api.azurewebsites.net/api/v1';
    
    // DOM Elements
    const statusIndicator = document.getElementById('apiStatus');
    const btnRefresh = document.getElementById('btnRefreshData');
    const feedContent = document.getElementById('feedContent');
    const consoleFeed = document.getElementById('consoleFeed');
    const scrollLoader = document.getElementById('scrollLoader');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const btnExport = document.getElementById('btnExport');
    const feedSection = document.getElementById('feedSection');

    const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

    // State Management
    let isInitialized = false;
    let currentFilter = 'recent';
    let currentOffset = 0;
    const LIMIT = 50;
    let isFetchingFeed = false;
    let hasMoreData = true;

    // --- 1. Top Level Dashboard Init ---
    async function initDashboard() {
        if (!isInitialized) {
            btnRefresh.innerText = '🔄 Refresh Data';
            btnRefresh.classList.add('initialized');
            btnRefresh.classList.remove('btn-run');
            feedContent.innerHTML = ''; 
            isInitialized = true;
        }

        document.querySelectorAll('.loader-small').forEach(l => l.style.display = 'block');
        btnRefresh.disabled = true;
        statusIndicator.className = 'api-status fetching';
        statusIndicator.innerText = '↻ Fetching Azure Data...';

        try {
            // Fetch top KPIs
            const summaryRes = await fetch(`${BASE_URL}/metrics/summary`);
            if (!summaryRes.ok) throw new Error("API Error");
            const summaryData = await summaryRes.json();

            document.getElementById('valTotalClaims').innerText = new Intl.NumberFormat('en-US').format(summaryData.total_claims);
            document.getElementById('valFraudFlags').innerText = new Intl.NumberFormat('en-US').format(summaryData.total_fraud_flagged);
            document.getElementById('valPayout').innerText = formatCurrency(summaryData.total_payout_volume);

            statusIndicator.className = 'api-status connected';
            statusIndicator.innerText = '● Connected to Azure';
            
            // Unhide the terminal feed
            feedSection.style.display = 'block';
            
            // Start the feed
            await loadFeedData(true);

        } catch (error) {
            console.error(error);
            statusIndicator.className = 'api-status error';
            statusIndicator.innerText = '● Connection Failed';
            feedSection.style.display = 'block';
            feedContent.innerHTML = `<span style="color: #ff7b72;">Critical Error: Unable to establish connection to Azure App Service.</span>`;
        } finally {
            document.querySelectorAll('.loader-small').forEach(l => l.style.display = 'none');
            btnRefresh.disabled = false;
        }
    }

    // --- 2. Infinite Scroll Feed Logic ---
    async function loadFeedData(reset = false) {
        if (isFetchingFeed || !hasMoreData) return;
        isFetchingFeed = true;

        if (reset) {
            currentOffset = 0;
            feedContent.innerHTML = '';
            hasMoreData = true;
        }

        scrollLoader.style.display = 'block';

        try {
            const res = await fetch(`${BASE_URL}/claims/${currentFilter}?limit=${LIMIT}&offset=${currentOffset}`);
            const data = await res.json();

            if (data.length < LIMIT) hasMoreData = false;

            data.forEach(claim => {
                const isFraud = claim.is_fraud_flagged === 1 || claim.is_fraud_flagged === true;
                const tagHTML = isFraud ? `<span class="log-fraud">🚨 HIGH RISK</span>` : `<span class="log-safe">✓ STANDARD</span>`;
                
                const logHTML = `
                    <div class="log-entry">
                        <span class="log-time">[${claim.incident_date}]</span> 
                        <span class="log-id">CLM-${claim.claim_id}</span> | 
                        <span class="log-amount">${formatCurrency(claim.claim_amount)}</span> | 
                        <span style="display:inline-block; width:110px;">${tagHTML}</span> | 
                        ${claim.incident_type} (${claim.region}) 
                    </div>
                `;
                feedContent.insertAdjacentHTML('beforeend', logHTML);
            });

            currentOffset += LIMIT;
        } catch (error) {
            feedContent.innerHTML += `<div style="color: #ff7b72; margin-top:10px;">Failed to load feed chunk.</div>`;
        } finally {
            scrollLoader.style.display = 'none';
            isFetchingFeed = false;
        }
    }

    // Detect when user scrolls to bottom of terminal
    consoleFeed.addEventListener('scroll', () => {
        if (consoleFeed.scrollTop + consoleFeed.clientHeight >= consoleFeed.scrollHeight - 50) {
            loadFeedData();
        }
    });

    // --- 3. Filter Buttons ---
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!isInitialized) return;
            
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            loadFeedData(true);
        });
    });

    // --- 4. Export CSV Logic ---
    btnExport.addEventListener('click', async () => {
        if (!isInitialized) return alert("Please initialize the cloud connection first.");
        
        const originalText = btnExport.innerText;
        btnExport.innerText = '⏳ Generating CSV...';
        btnExport.disabled = true;

        try {
            const res = await fetch(`${BASE_URL}/claims/${currentFilter}?limit=1000&offset=0`);
            const data = await res.json();

            if (data.length === 0) {
                alert("No data to export.");
                return;
            }

            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
            const csvContent = headers + '\n' + rows;

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `claims_export_${currentFilter}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            alert("Failed to export dataset from Azure.");
        } finally {
            btnExport.innerText = originalText;
            btnExport.disabled = false;
        }
    });

    // Bind Primary Button
    btnRefresh.addEventListener('click', initDashboard);
});