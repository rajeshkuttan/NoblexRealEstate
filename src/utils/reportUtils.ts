// Report generation and export utilities

const formatDataToHTML = (data: any): string => {
  if (!data || !data.data) return '';
  
  const reportData = data.data;
  let html = '';

  // Add Summary Section
  if (reportData.summary) {
    html += '<div class="summary-box"><h2>Summary</h2><table class="summary-table">';
    Object.entries(reportData.summary).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      html += `<tr><td class="label">${label}</td><td class="value">${value}</td></tr>`;
    });
    html += '</table></div>';
  }

  // Add Monthly/Trend Data
  if (reportData.monthlyBreakdown) {
    html += '<div class="data-section"><h2>Monthly Breakdown</h2><table>';
    html += '<thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr></thead><tbody>';
    reportData.monthlyBreakdown.forEach((item: any) => {
      html += `<tr>
        <td>${item.month}</td>
        <td>AED ${item.revenue.toLocaleString()}</td>
        <td>AED ${item.expenses.toLocaleString()}</td>
        <td>AED ${item.profit.toLocaleString()}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Top Revenue Sources
  if (reportData.topRevenueSources) {
    html += '<div class="data-section"><h2>Top Revenue Sources</h2><table>';
    html += '<thead><tr><th>Source</th><th>Revenue</th><th>Percentage</th></tr></thead><tbody>';
    reportData.topRevenueSources.forEach((item: any) => {
      html += `<tr>
        <td>${item.source}</td>
        <td>AED ${item.revenue.toLocaleString()}</td>
        <td>${item.percentage}%</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Property Performance
  if (reportData.propertyPerformance) {
    html += '<div class="data-section"><h2>Property Performance</h2><table>';
    html += '<thead><tr><th>Property</th><th>Occupancy</th><th>Revenue</th><th>Rating</th><th>Units</th></tr></thead><tbody>';
    reportData.propertyPerformance.forEach((item: any) => {
      html += `<tr>
        <td>${item.property}</td>
        <td>${item.occupancy}%</td>
        <td>AED ${item.revenue.toLocaleString()}</td>
        <td>${item.rating}/5</td>
        <td>${item.units}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Occupancy Trends
  if (reportData.occupancyTrends) {
    html += '<div class="data-section"><h2>Occupancy Trends</h2><table>';
    html += '<thead><tr><th>Month</th><th>Occupancy</th><th>Vacant Units</th></tr></thead><tbody>';
    reportData.occupancyTrends.forEach((item: any) => {
      html += `<tr>
        <td>${item.month}</td>
        <td>${item.occupancy}%</td>
        <td>${item.vacantUnits}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Satisfaction Scores
  if (reportData.satisfactionScores) {
    html += '<div class="data-section"><h2>Satisfaction Scores</h2><table>';
    html += '<thead><tr><th>Category</th><th>Score</th><th>Responses</th></tr></thead><tbody>';
    reportData.satisfactionScores.forEach((item: any) => {
      html += `<tr>
        <td>${item.category}</td>
        <td>${item.score}/5</td>
        <td>${item.responses}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Payment Behavior
  if (reportData.paymentBehavior) {
    html += '<div class="data-section"><h2>Payment Behavior</h2><table>';
    html += '<thead><tr><th>Status</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
    reportData.paymentBehavior.forEach((item: any) => {
      html += `<tr>
        <td>${item.status}</td>
        <td>${item.count}</td>
        <td>${item.percentage}%</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Demographics Data
  if (reportData.demographicsData) {
    html += '<div class="data-section"><h2>Demographics</h2><table>';
    html += '<thead><tr><th>Segment</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
    reportData.demographicsData.forEach((item: any) => {
      html += `<tr>
        <td>${item.segment}</td>
        <td>${item.count}</td>
        <td>${item.percentage}%</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Lease Status
  if (reportData.leaseStatus) {
    html += '<div class="data-section"><h2>Lease Status</h2><table>';
    html += '<thead><tr><th>Status</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
    reportData.leaseStatus.forEach((item: any) => {
      html += `<tr>
        <td>${item.status}</td>
        <td>${item.count}</td>
        <td>${item.percentage}%</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Renewal Analysis
  if (reportData.renewalAnalysis) {
    html += '<div class="data-section"><h2>Renewal Analysis</h2><table>';
    html += '<thead><tr><th>Month</th><th>Renewals</th><th>Retention Rate</th></tr></thead><tbody>';
    reportData.renewalAnalysis.forEach((item: any) => {
      html += `<tr>
        <td>${item.month}</td>
        <td>${item.renewals}</td>
        <td>${item.retention}%</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Lease Durations
  if (reportData.leaseDurations) {
    html += '<div class="data-section"><h2>Lease Durations</h2><table>';
    html += '<thead><tr><th>Duration</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
    reportData.leaseDurations.forEach((item: any) => {
      html += `<tr>
        <td>${item.duration}</td>
        <td>${item.count}</td>
        <td>${item.percentage}%</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Tickets By Status
  if (reportData.ticketsByStatus) {
    html += '<div class="data-section"><h2>Tickets By Status</h2><table>';
    html += '<thead><tr><th>Status</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
    reportData.ticketsByStatus.forEach((item: any) => {
      html += `<tr>
        <td>${item.status}</td>
        <td>${item.count}</td>
        <td>${item.percentage}%</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Category Breakdown
  if (reportData.categoryBreakdown) {
    html += '<div class="data-section"><h2>Category Breakdown</h2><table>';
    html += '<thead><tr><th>Category</th><th>Count</th><th>Cost</th><th>Avg Time (days)</th></tr></thead><tbody>';
    reportData.categoryBreakdown.forEach((item: any) => {
      html += `<tr>
        <td>${item.category}</td>
        <td>${item.count}</td>
        <td>AED ${item.cost.toLocaleString()}</td>
        <td>${item.avgTime}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Add Monthly Trends
  if (reportData.monthlyTrends) {
    html += '<div class="data-section"><h2>Monthly Trends</h2><table>';
    html += '<thead><tr><th>Month</th><th>Tickets</th><th>Completed</th><th>Cost</th></tr></thead><tbody>';
    reportData.monthlyTrends.forEach((item: any) => {
      html += `<tr>
        <td>${item.month}</td>
        <td>${item.tickets}</td>
        <td>${item.completed}</td>
        <td>AED ${item.cost.toLocaleString()}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  return html;
};

export const generatePDF = (reportData: any, reportName: string) => {
  // Create a professional HTML structure for the report
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportName}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 30px; 
          background-color: #f5f5f5;
          color: #333;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 { 
          margin: 0; 
          font-size: 32px;
          font-weight: 600;
        }
        .timestamp {
          margin-top: 10px;
          opacity: 0.9;
          font-size: 14px;
        }
        .summary-box {
          background-color: white;
          padding: 25px;
          border-radius: 10px;
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .data-section {
          background-color: white;
          padding: 25px;
          border-radius: 10px;
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h2 { 
          color: #667eea;
          font-size: 22px;
          margin-top: 0;
          margin-bottom: 20px;
          border-bottom: 2px solid #667eea;
          padding-bottom: 10px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 15px 0; 
        }
        .summary-table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        .summary-table .label {
          font-weight: 600;
          color: #555;
          width: 40%;
        }
        .summary-table .value {
          color: #667eea;
          font-weight: 600;
          font-size: 16px;
        }
        thead {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        th, td { 
          border: 1px solid #e0e0e0; 
          padding: 12px; 
          text-align: left; 
        }
        th { 
          font-weight: 600;
          text-transform: uppercase;
          font-size: 13px;
          letter-spacing: 0.5px;
        }
        tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        tbody tr:hover {
          background-color: #f0f0f0;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding: 20px;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${reportName}</h1>
        <div class="timestamp">Generated on: ${new Date().toLocaleString('en-AE', { 
          dateStyle: 'full', 
          timeStyle: 'medium' 
        })}</div>
      </div>
      ${formatDataToHTML(reportData)}
      <div class="footer">
        <p>© ${new Date().getFullYear()} Property Management System - Confidential Report</p>
        <p>Report ID: ${reportData.reportType}-${Date.now()}</p>
      </div>
    </body>
    </html>
  `;

  // Create a Blob with the HTML content
  const blob = new Blob([htmlContent], { type: 'text/html' });
  
  // Create a download link and trigger it
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().getTime()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const generateExcel = (reportData: any, reportName: string) => {
  // Convert data to CSV format (simple Excel-compatible format)
  let csvContent = `${reportName}\nGenerated: ${new Date().toLocaleString('en-AE')}\n\n`;

  // If reportData is an array, convert to table
  if (Array.isArray(reportData)) {
    if (reportData.length > 0) {
      // Get headers from first object
      const headers = Object.keys(reportData[0]);
      csvContent += headers.join(',') + '\n';

      // Add data rows
      reportData.forEach((row) => {
        const values = headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += values.join(',') + '\n';
      });
    }
  } else {
    // Convert object to key-value pairs
    csvContent += 'Field,Value\n';
    Object.entries(reportData).forEach(([key, value]) => {
      csvContent += `${key},"${value}"\n`;
    });
  }

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().getTime()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const generateCSV = (reportData: any, reportName: string) => {
  // Same as Excel for now
  generateExcel(reportData, reportName);
};

export const generateJSON = (reportData: any, reportName: string) => {
  const jsonContent = JSON.stringify(reportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Helper function to convert chart data to downloadable format
export const exportChartData = (data: any[], reportName: string, format: 'csv' | 'excel' | 'json' = 'csv') => {
  switch (format) {
    case 'excel':
    case 'csv':
      generateExcel(data, reportName);
      break;
    case 'json':
      generateJSON(data, reportName);
      break;
    default:
      generateCSV(data, reportName);
  }
};

// Helper to generate report summary
export const generateReportSummary = (reportType: string, data: any) => {
  return {
    reportType,
    generatedAt: new Date().toISOString(),
    generatedBy: 'System',
    dataPoints: Array.isArray(data) ? data.length : Object.keys(data).length,
    data: data
  };
};

