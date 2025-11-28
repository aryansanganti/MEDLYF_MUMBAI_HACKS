// services/pdfService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Remove markdown formatting from text
 */
function cleanMarkdown(text) {
    if (!text) return '';

    return text
        // Remove headers (##, ###, etc.)
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold (**text** or __text__)
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        // Remove italic (*text* or _text_)
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        // Remove bullet points and list markers
        .replace(/^\s*[-*+]\s+/gm, '• ')
        // Remove numbered lists
        .replace(/^\s*\d+\.\s+/gm, '')
        // Remove horizontal rules
        .replace(/^---+$/gm, '')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`(.+?)`/g, '$1')
        // Clean up extra whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Generate a professional hospital PDF report
 * @param {Object} data - Aggregated hospital data
 * @param {string} summary - AI-generated summary
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generatePDFReport(data, summary) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                bufferPages: true
            });

            const chunks = [];

            // Collect PDF data
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const pageWidth = doc.page.width - 120; // Account for margins
            const primaryColor = '#0066CC';
            const secondaryColor = '#003366';
            const accentColor = '#FF6B35';

            // ==================== COVER PAGE ====================

            // Header bar
            doc.rect(0, 0, doc.page.width, 80)
                .fill(primaryColor);

            // Hospital logo/icon (using text as placeholder)
            doc.fontSize(40)
                .fillColor('#FFFFFF')
                .text('⚕', 60, 20, { width: pageWidth, align: 'center' });

            // Main title
            doc.fontSize(32)
                .font('Helvetica-Bold')
                .fillColor('#FFFFFF')
                .text('MEDLYF HOSPITAL', 60, 100, { width: pageWidth, align: 'center' });

            doc.fontSize(24)
                .font('Helvetica')
                .text('System Analytics Report', 60, 145, { width: pageWidth, align: 'center' });

            // Date and time box
            const reportDate = new Date();
            const dateStr = reportDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const timeStr = reportDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            doc.rect(60, 220, pageWidth, 100)
                .fillAndStroke('#F8F9FA', '#DDDDDD');

            doc.fontSize(12)
                .fillColor('#666666')
                .font('Helvetica')
                .text('Report Generated:', 80, 240);

            doc.fontSize(14)
                .fillColor('#000000')
                .font('Helvetica-Bold')
                .text(dateStr, 80, 260);

            doc.fontSize(12)
                .fillColor('#666666')
                .font('Helvetica')
                .text('Time:', 80, 285);

            doc.fontSize(14)
                .fillColor('#000000')
                .font('Helvetica-Bold')
                .text(timeStr, 120, 285);

            // Key metrics summary boxes
            const metrics = [
                { label: 'Total Patients', value: data.patients?.total || 0, color: primaryColor },
                { label: 'Bed Occupancy', value: `${data.patients?.occupancyRate || 0}%`, color: accentColor },
                { label: 'Active Jobs', value: data.jobs?.total || 0, color: secondaryColor }
            ];

            let boxY = 360;
            metrics.forEach((metric, index) => {
                const boxX = 60 + (index * (pageWidth / 3));
                const boxWidth = (pageWidth / 3) - 10;

                doc.rect(boxX, boxY, boxWidth, 80)
                    .fill(metric.color);

                doc.fontSize(28)
                    .fillColor('#FFFFFF')
                    .font('Helvetica-Bold')
                    .text(String(metric.value), boxX, boxY + 15, { width: boxWidth, align: 'center' });

                doc.fontSize(10)
                    .fillColor('#FFFFFF')
                    .font('Helvetica')
                    .text(metric.label, boxX, boxY + 55, { width: boxWidth, align: 'center' });
            });

            // Footer
            doc.fontSize(8)
                .fillColor('#999999')
                .font('Helvetica')
                .text('CONFIDENTIAL - For Internal Use Only', 60, doc.page.height - 40, {
                    width: pageWidth,
                    align: 'center'
                });

            // ==================== PAGE 2: EXECUTIVE SUMMARY ====================
            doc.addPage();

            // Page header
            addPageHeader(doc, 'Executive Summary', primaryColor);

            // Clean and display AI summary
            if (summary) {
                const cleanedSummary = cleanMarkdown(summary);

                doc.fontSize(11)
                    .fillColor('#333333')
                    .font('Helvetica')
                    .text(cleanedSummary, 60, 140, {
                        width: pageWidth,
                        align: 'justify',
                        lineGap: 4
                    });
            } else {
                doc.fontSize(11)
                    .fillColor('#999999')
                    .font('Helvetica-Oblique')
                    .text('No AI summary available for this report.', 60, 140, {
                        width: pageWidth,
                        align: 'center'
                    });
            }

            // ==================== PAGE 3: PATIENT STATISTICS ====================
            doc.addPage();
            addPageHeader(doc, 'Patient Statistics', primaryColor);

            let currentY = 140;

            // Patient overview section
            addSectionTitle(doc, 'Overview', currentY);
            currentY += 35;

            const patientOverview = [
                { label: 'Total Patients Registered', value: data.patients?.total || 0 },
                { label: 'Currently Active Patients', value: data.patients?.active || 0 },
                { label: 'Total Available Beds', value: data.patients?.totalBeds || 45 },
                { label: 'Occupied Beds', value: data.patients?.active || 0 },
                { label: 'Available Beds', value: (data.patients?.totalBeds || 45) - (data.patients?.active || 0) },
                { label: 'Bed Occupancy Rate', value: `${data.patients?.occupancyRate || 0}%` }
            ];

            currentY = addProfessionalTable(doc, patientOverview, currentY, pageWidth);

            // Recent admissions
            currentY += 30;
            addSectionTitle(doc, 'Recent Activity', currentY);
            currentY += 35;

            const recentStats = [
                { label: 'Admissions (Last 24 Hours)', value: data.patients?.recentAdmissions || 0 }
            ];

            currentY = addProfessionalTable(doc, recentStats, currentY, pageWidth);

            // Status indicator
            currentY += 30;
            const occupancyRate = data.patients?.occupancyRate || 0;
            let statusColor, statusText;

            if (occupancyRate >= 90) {
                statusColor = '#DC2626';
                statusText = 'CRITICAL - Near Full Capacity';
            } else if (occupancyRate >= 75) {
                statusColor = '#F59E0B';
                statusText = 'WARNING - High Occupancy';
            } else {
                statusColor = '#10B981';
                statusText = 'NORMAL - Adequate Capacity';
            }

            doc.rect(60, currentY, pageWidth, 50)
                .fill(statusColor);

            doc.fontSize(14)
                .fillColor('#FFFFFF')
                .font('Helvetica-Bold')
                .text(statusText, 60, currentY + 17, { width: pageWidth, align: 'center' });

            // ==================== PAGE 4: OXYGEN & RESOURCES ====================
            doc.addPage();
            addPageHeader(doc, 'Oxygen & Resource Management', primaryColor);

            currentY = 140;

            // Oxygen status
            addSectionTitle(doc, 'Oxygen Supply Status', currentY);
            currentY += 35;

            const oxygenData = [
                { label: 'Total Oxygen Capacity', value: `${(data.oxygen?.capacity || 0).toLocaleString()} Liters` },
                { label: 'Oxygen Currently Used', value: `${(data.oxygen?.totalUsed || 0).toLocaleString()} Liters` },
                { label: 'Oxygen Remaining', value: `${(data.oxygen?.remaining || 0).toLocaleString()} Liters` },
                { label: 'Percentage Remaining', value: `${data.oxygen?.percentageRemaining || 0}%` }
            ];

            currentY = addProfessionalTable(doc, oxygenData, currentY, pageWidth);

            // Oxygen status bar
            currentY += 30;
            const oxygenPercent = data.oxygen?.percentageRemaining || 0;

            doc.fontSize(11)
                .fillColor('#666666')
                .font('Helvetica')
                .text('Oxygen Level Indicator:', 60, currentY);

            currentY += 20;

            // Progress bar background
            doc.rect(60, currentY, pageWidth, 25)
                .fillAndStroke('#E5E7EB', '#D1D5DB');

            // Progress bar fill
            let barColor;
            if (oxygenPercent < 20) barColor = '#DC2626';
            else if (oxygenPercent < 50) barColor = '#F59E0B';
            else barColor = '#10B981';

            const barWidth = (pageWidth * oxygenPercent) / 100;
            doc.rect(60, currentY, barWidth, 25)
                .fill(barColor);

            doc.fontSize(12)
                .fillColor('#000000')
                .font('Helvetica-Bold')
                .text(`${oxygenPercent}%`, 60, currentY + 6, { width: pageWidth, align: 'center' });

            // ==================== PAGE 5: LOGISTICS ====================
            doc.addPage();
            addPageHeader(doc, 'Logistics & Operations', primaryColor);

            currentY = 140;

            // Jobs overview
            addSectionTitle(doc, 'Job Management', currentY);
            currentY += 35;

            const jobsData = [
                { label: 'Total Jobs', value: data.jobs?.total || 0 },
                { label: 'Pending Jobs', value: data.jobs?.pending || 0 },
                { label: 'Assigned Jobs', value: data.jobs?.assigned || 0 },
                { label: 'Completed Jobs', value: data.jobs?.completed || 0 }
            ];

            currentY = addProfessionalTable(doc, jobsData, currentY, pageWidth);

            currentY += 30;
            addSectionTitle(doc, 'Fleet Status', currentY);
            currentY += 35;

            const vehicleData = [
                { label: 'Active Vehicles', value: data.vehicles?.total || 0 }
            ];

            currentY = addProfessionalTable(doc, vehicleData, currentY, pageWidth);

            // ==================== FOOTER ON ALL PAGES ====================
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);

                // Page number
                doc.fontSize(9)
                    .fillColor('#999999')
                    .font('Helvetica')
                    .text(
                        `Page ${i + 1} of ${pageCount}`,
                        60,
                        doc.page.height - 40,
                        { width: pageWidth, align: 'center' }
                    );
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Add a professional page header
 */
function addPageHeader(doc, title, color) {
    doc.rect(0, 0, doc.page.width, 100)
        .fill(color);

    doc.fontSize(24)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .text(title, 60, 35, { width: doc.page.width - 120, align: 'left' });

    // Decorative line
    doc.rect(60, 85, doc.page.width - 120, 2)
        .fill('#FFFFFF');
}

/**
 * Add a section title
 */
function addSectionTitle(doc, title, y) {
    doc.fontSize(16)
        .fillColor('#003366')
        .font('Helvetica-Bold')
        .text(title, 60, y);

    // Underline
    doc.rect(60, y + 22, 100, 2)
        .fill('#0066CC');
}

/**
 * Add a professional table
 */
function addProfessionalTable(doc, data, startY, pageWidth) {
    const rowHeight = 35;
    let currentY = startY;

    data.forEach((row, index) => {
        // Alternating row colors
        const bgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF';

        doc.rect(60, currentY, pageWidth, rowHeight)
            .fillAndStroke(bgColor, '#E5E7EB');

        // Label
        doc.fontSize(11)
            .fillColor('#4B5563')
            .font('Helvetica')
            .text(row.label, 75, currentY + 10, { width: pageWidth * 0.6 });

        // Value
        doc.fontSize(12)
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .text(String(row.value), 75 + (pageWidth * 0.6), currentY + 10, {
                width: pageWidth * 0.35,
                align: 'right'
            });

        currentY += rowHeight;
    });

    return currentY;
}

module.exports = {
    generatePDFReport,
    cleanMarkdown
};
