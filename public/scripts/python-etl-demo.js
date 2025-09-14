// Waits for the whole page to load
document.addEventListener('DOMContentLoaded', () => {

    // Find the main element and READ data attribute
    const mainElement = document.querySelector('main');
    const apiEndpoint = mainElement.dataset.apiEndpoint;

    // Now find all the other elements
    const runButton = document.getElementById('run-etl-button');
    const resultsContainer = document.getElementById('etl-results');
    const citySelect = document.getElementById('etl-city-select');

    let currentWeatherData = null;

    const toFahrenheit = (celsius) => {
        return (celsius * 9/5) + 32;
    };

    function renderResults() {
        if (!currentWeatherData) return;

        const data = currentWeatherData;
        const unitToggle = document.getElementById('unit-toggle');
        
        // Only check for Fahrenheit if the toggle actually exists AND is checked.
        const isFahrenheit = unitToggle ? unitToggle.checked : false;

        // Convert data if the toggle is set to Fahrenheit
        const maxTemp = isFahrenheit ? toFahrenheit(data.max_temp_celsius) : data.max_temp_celsius;
        const minTemp = isFahrenheit ? toFahrenheit(data.min_temp_celsius) : data.min_temp_celsius;
        const avgTemp = isFahrenheit ? toFahrenheit(data.avg_temp_celsius) : data.avg_temp_celsius;
        const unitLabel = isFahrenheit ? '°F' : '°C';

        // Build the HTML
        const resultHTML = `
            <div class="results-header">
                <h4>Pipeline Successful!</h4>
                <div class="unit-toggle">
                    <span>°C</span>
                    <label class="theme-switch" for="unit-toggle">
                        <input type="checkbox" id="unit-toggle" ${isFahrenheit ? 'checked' : ''} />
                        <span class="slider"></span>
                    </label>
                    <span>°F</span>
                </div> 
            </div>

            <p>Data processed and saved to S3. Here is the summary:</p>
            
            <div class="results-flex">
                <div class="data-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span class="data-label">Date</span>
                    <span>${data.date}</span>
                </div>
                <div class="data-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                    <span class="data-label">Max Temp</span>
                    <span>${maxTemp.toFixed(1)}${unitLabel}</span>
                </div>
                <div class="data-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                    <span class="data-label">Min Temp</span>
                    <span>${minTemp.toFixed(1)}${unitLabel}</span>
                </div>
                <div class="data-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>
                    <span class="data-label">Avg Temp</span>
                    <span>${avgTemp.toFixed(1)}${unitLabel}</span>
                </div>
                <div class="data-item">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                    <span class="data-label">Precipitation</span>
                    <span>${data.total_precipitation_mm} mm</span>
                </div>
            </div>
        `;
        resultsContainer.innerHTML = resultHTML;

        const newUnitToggle = document.getElementById('unit-toggle');
        
        if (newUnitToggle && !newUnitToggle.hasListener) {
            newUnitToggle.addEventListener('change', () => {
                renderResults();
            });
            newUnitToggle.hasListener = true; 
        }
    }

    runButton.addEventListener('click', async () => {
        try {
            resultsContainer.innerHTML = '<p>Running pipeline... please wait.</p>';
            const selectedCity = citySelect.value;
            const apiUrlWithQuery = `${apiEndpoint}?city=${selectedCity}`;

            const response = await fetch(apiUrlWithQuery);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            
            currentWeatherData = await response.json();
            renderResults();

        } catch (error) {
            resultsContainer.innerHTML = `<p style="color: red;">Error: Could not run pipeline.</p>`;
            console.error(error);
        }
    });

    resultsContainer.addEventListener('change', (event) => {        
        if (event.target.id === 'unit-toggle') {
            renderResults();
        }
    });
});