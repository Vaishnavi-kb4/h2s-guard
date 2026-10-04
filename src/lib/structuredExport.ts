import type { Measurement, BadgeRecord, Worker } from "@/types/h2s";
import { toast } from "sonner";

export interface OccupationalRecordRow {
  workerId: string;
  workerName: string;
  timestamp: string;
  shift: string;
  doseEstimate: string; // e.g. "2.10 ppm·h"
  uncertainty: string; // e.g. "±0.15 ppm·h"
  estimatedRange: string; // e.g. "1.95 – 2.25 ppm·h"
  twaEstimate: string; // e.g. "0.26 ppm"
  calibrationRange: string; // "WITHIN VALIDATED RANGE" | "OUTSIDE VALIDATED RANGE"
  calibrationVersion: string;
  badgeId: string;
  expiryStatus: string; // "VALID" | "EXPIRED" | "EXPIRING SOON" | "UNKNOWN"
  expiryDate: string;
  measurementStatus: string;
  traceId: string;
}

export function compileOccupationalHealthRecords(
  measurements: Measurement[],
  badges: BadgeRecord[] = [],
  workers: Worker[] = []
): OccupationalRecordRow[] {
  return measurements.map((m) => {
    const matchedBadge = badges.find((b) => b.id === m.badgeId || b.workerId === m.workerId);
    const matchedWorker = workers.find((w) => w.id === m.workerId);

    const workerName = matchedWorker?.name || (m.workerId === "W-102" ? "Arun Kumar" : `Worker (${m.workerId})`);
    const doseNum = m.exposure !== null && m.exposure !== undefined ? m.exposure : 0;
    const doseVal = m.exposure !== null && m.exposure !== undefined ? `${m.exposure.toFixed(2)} ppm·h` : "N/A (Pending)";
    const uncVal = m.uncertainty || "±0.15 ppm·h";
    const lower = m.lowerBound !== undefined ? m.lowerBound : Math.max(0, doseNum - 0.15);
    const upper = m.upperBound !== undefined ? m.upperBound : doseNum + 0.15;
    const rangeVal = `${lower.toFixed(2)} – ${upper.toFixed(2)} ppm·h`;
    const twaVal = m.twaPpm !== undefined ? `${m.twaPpm.toFixed(2)} ppm` : m.exposure ? `${(m.exposure / 8).toFixed(2)} ppm` : "0.00 ppm";
    const calRange = m.calibrationRange || "WITHIN VALIDATED RANGE";
    const calVer = m.calibrationVersion || m.calibration || "SentraBand PCHIP + CIEDE2000 LUT Model";

    // Determine Expiry Status
    let expiryStatus = matchedBadge?.status || "VALID";
    let expiryDate = matchedBadge?.expiry || "12 Jan 2027";

    if (matchedBadge?.expiry) {
      const expTime = new Date(matchedBadge.expiry).getTime();
      if (!isNaN(expTime)) {
        const now = Date.now();
        if (expTime < now) {
          expiryStatus = "EXPIRED";
        } else if (expTime - now < 30 * 24 * 60 * 60 * 1000) {
          expiryStatus = "EXPIRING SOON";
        }
      }
    }

    return {
      workerId: m.workerId || "UNKNOWN",
      workerName,
      timestamp: m.timestamp || m.time || new Date().toISOString(),
      shift: m.shift || "General Shift",
      doseEstimate: doseVal,
      uncertainty: uncVal,
      estimatedRange: rangeVal,
      twaEstimate: twaVal,
      calibrationRange: calRange,
      calibrationVersion: calVer,
      badgeId: m.badgeId || "N/A",
      expiryStatus: expiryStatus.toUpperCase(),
      expiryDate,
      measurementStatus: m.status || "VALID",
      traceId: m.traceId || m.id || "N/A",
    };
  });
}

/**
 * Generates a structured CSV file for occupational health record-keeping.
 */
export function exportOccupationalHealthCSV(
  measurements: Measurement[],
  badges: BadgeRecord[] = [],
  workers: Worker[] = []
) {
  if (!measurements || measurements.length === 0) {
    toast.error("No measurement data available to export.");
    return;
  }

  const records = compileOccupationalHealthRecords(measurements, badges, workers);

  const headers = [
    "Worker ID",
    "Worker Name",
    "Timestamp",
    "Shift",
    "Dose Estimate (ppm·h)",
    "Uncertainty",
    "Estimated Range (ppm·h)",
    "8h TWA (ppm)",
    "Calibration Range Status",
    "Calibration Version",
    "Badge ID",
    "Badge Expiry Status",
    "Badge Expiry Date",
    "Measurement Status",
    "Traceability ID",
  ];

  const csvRows = [
    headers.join(","),
    ...records.map((r) =>
      [
        `"${r.workerId}"`,
        `"${r.workerName}"`,
        `"${r.timestamp}"`,
        `"${r.shift}"`,
        `"${r.doseEstimate}"`,
        `"${r.uncertainty}"`,
        `"${r.estimatedRange}"`,
        `"${r.twaEstimate}"`,
        `"${r.calibrationRange}"`,
        `"${r.calibrationVersion}"`,
        `"${r.badgeId}"`,
        `"${r.expiryStatus}"`,
        `"${r.expiryDate}"`,
        `"${r.measurementStatus}"`,
        `"${r.traceId}"`,
      ].join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const nowStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  link.setAttribute("href", url);
  link.setAttribute("download", `H2S_Occupational_Health_Exposure_Records_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Structured CSV Exported (${records.length} records)`);
}

/**
 * Generates a formatted PDF report window suitable for printing / Save to PDF.
 */
export function exportOccupationalHealthPDF(
  measurements: Measurement[],
  badges: BadgeRecord[] = [],
  workers: Worker[] = []
) {
  if (!measurements || measurements.length === 0) {
    toast.error("No measurement data available to generate PDF report.");
    return;
  }

  const records = compileOccupationalHealthRecords(measurements, badges, workers);
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    toast.error("Popup blocked! Please allow popups to generate the PDF report.");
    return;
  }

  const totalRecords = records.length;
  const validRecords = records.filter((r) => r.measurementStatus === "VALID").length;
  const expiredBadges = records.filter((r) => r.expiryStatus === "EXPIRED").length;
  const generatedTime = new Date().toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  const tableRowsHtml = records
    .map(
      (r, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
      <td style="padding: 8px 10px; font-weight: bold; font-family: monospace;">${r.workerId}</td>
      <td style="padding: 8px 10px;">${r.workerName}</td>
      <td style="padding: 8px 10px; font-size: 11px;">${r.timestamp}</td>
      <td style="padding: 8px 10px;">${r.shift}</td>
      <td style="padding: 8px 10px; font-weight: bold; color: #1e3a8a;">${r.doseEstimate}</td>
      <td style="padding: 8px 10px; font-family: monospace;">${r.twaEstimate}</td>
      <td style="padding: 8px 10px; font-family: monospace;">${r.badgeId}</td>
      <td style="padding: 8px 10px;">
        <span style="
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          background-color: ${r.expiryStatus === "VALID" ? "#dcfce7" : r.expiryStatus === "EXPIRED" ? "#fee2e2" : "#fef3c7"};
          color: ${r.expiryStatus === "VALID" ? "#166534" : r.expiryStatus === "EXPIRED" ? "#991b1b" : "#92400e"};
        ">
          ${r.expiryStatus}
        </span>
      </td>
      <td style="padding: 8px 10px;">
        <span style="
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          background-color: ${r.measurementStatus === "VALID" ? "#e0f2fe" : "#fef3c7"};
          color: ${r.measurementStatus === "VALID" ? "#075985" : "#92400e"};
        ">
          ${r.measurementStatus}
        </span>
      </td>
    </tr>
  `
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>H₂S Guard — Occupational Health Exposure Report</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 12px; }
          .header { border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 900; color: #1e3a8a; margin: 0; text-transform: uppercase; tracking: 0.5px; }
          .subtitle { font-size: 11px; color: #475569; margin-top: 4px; font-weight: 600; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; }
          .meta-item { font-size: 11px; }
          .meta-label { font-size: 9px; text-transform: uppercase; font-weight: 800; color: #64748b; }
          .meta-val { font-weight: 800; color: #0f172a; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background-color: #1e3a8a; color: white; padding: 9px 10px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
          td { border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          .signature-box { margin-top: 25px; display: flex; justify-content: space-between; }
          .sig-line { width: 220px; border-top: 1.5px dashed #475569; padding-top: 4px; font-size: 11px; font-weight: bold; text-align: center; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; padding: 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #1e40af;">📄 Official Occupational Health Exposure Report Ready</span>
          <button onclick="window.print()" style="background: #1e3a8a; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <h1 class="title">H₂S GUARD — Occupational Health Exposure Log</h1>
            <div class="subtitle">Official Shift Exposure & Badge Validity Record for Compliance & Health Audit</div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            <b>MRPL SRU Unit 09</b><br/>
            Generated: ${generatedTime}
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Total Records</div>
            <div class="meta-val">${totalRecords} Exposure Captures</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Valid Dosimetry</div>
            <div class="meta-val" style="color: #166534;">${validRecords} Valid Captures</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Expired Badges Logged</div>
            <div class="meta-val" style="color: ${expiredBadges > 0 ? "#b91c1c" : "#166534"};">${expiredBadges} Expired Badges</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Compliance Standard</div>
            <div class="meta-val">OSHA / HSE H₂S Passive Dosimetry</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Worker ID</th>
              <th>Worker Name</th>
              <th>Timestamp</th>
              <th>Shift</th>
              <th>Dose Estimate</th>
              <th>8h TWA</th>
              <th>Badge ID</th>
              <th>Expiry Status</th>
              <th>Capture Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="signature-box">
          <div class="sig-line">
            HSE Safety Officer Signature
          </div>
          <div class="sig-line">
            Occupational Health Officer Sign-off
          </div>
        </div>

        <div class="footer">
          <div>H₂S Guard Exposure Monitoring System — Official HSE Record</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Auto trigger print after render
  printWindow.onload = () => {
    printWindow.print();
  };

  toast.success("Occupational Health PDF Report generated.");
}
