// services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API using environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a comprehensive report summary using Gemini AI
 * @param {Object} data - Aggregated hospital data
 * @returns {Promise<string>} - AI-generated summary
 */
async function generateReportSummary(data) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured in environment variables');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Create a detailed prompt for the AI
        const prompt = `
You are a senior healthcare data analyst for MedLyf Hospital. Analyze the following hospital system data and provide a high-level executive report.

**CRITICAL INSTRUCTION: DO NOT USE ANY MARKDOWN FORMATTING.** 
- Do NOT use bold (**text**), italics (*text*), headers (##), or bullet points (*). 
- Use plain text only. 
- Use proper paragraph spacing for readability.
- Write in a strictly professional, formal tone suitable for hospital board members.

**Hospital Data:**
- Patient Occupancy: ${data.patients?.active || 0}/${data.patients?.totalBeds || 45} (${data.patients?.occupancyRate || 0}%)
- Admission Trend (Last 7 Days): ${JSON.stringify(data.patients?.trend || [])}
- Oxygen Status: ${data.oxygen?.remaining || 0}L remaining (${data.oxygen?.percentageRemaining || 0}%)
- Average Oxygen Usage: ${data.oxygen?.avgPerPatient || 0}L per patient
- Logistics: ${data.jobs?.pending || 0} pending jobs, ${data.jobs?.completed || 0} completed
- Fleet: ${data.vehicles?.total || 0} active vehicles

Please provide a comprehensive analysis covering:

1. EXECUTIVE SUMMARY
Provide a strategic overview of the hospital's current operational state. Focus on capacity management and critical resource levels.

2. PATIENT FLOW ANALYSIS
Analyze the admission trends and current occupancy. Are we approaching capacity? What are the implications for staffing and bed management?

3. CRITICAL RESOURCE ASSESSMENT
Evaluate the oxygen supply status. Based on the average usage per patient and current remaining levels, estimate how long the supply will last. Is an immediate refill required?

4. OPERATIONAL EFFICIENCY
Assess the logistics performance. Are there bottlenecks in job completion? Is the fleet size adequate for the current demand?

5. STRATEGIC RECOMMENDATIONS
Provide 3-4 specific, actionable recommendations for the hospital administration to improve efficiency and patient care safety over the next 24-48 hours.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();

        return summary;
    } catch (error) {
        console.error('Error generating Gemini summary:', error);
        throw new Error(`Failed to generate AI summary: ${error.message}`);
    }
}

/**
 * Generate insights for specific data points
 * @param {string} dataType - Type of data to analyze (patients, oxygen, jobs)
 * @param {Object} data - Specific data to analyze
 * @returns {Promise<string>} - AI-generated insights
 */
async function generateInsights(dataType, data) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return 'AI insights unavailable: API key not configured';
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
As a medical data analyst, provide brief insights (2-3 sentences) about the following ${dataType} data:

${JSON.stringify(data, null, 2)}

Focus on trends, anomalies, and actionable observations.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating insights:', error);
        return `Unable to generate insights: ${error.message}`;
    }
}

module.exports = {
    generateReportSummary,
    generateInsights
};
