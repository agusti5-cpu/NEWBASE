// NEWBASE — UN Comtrade connector
const API_BASE = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1500;
const DEFAULT_REQUEST_SPACING_MS = 1000;
const DEFAULT_PERIOD_LOOKBACK = 5;

function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function clamp(value, min = 0, max = 100) { const n = finite(value); return n === null ? min : Math.min(max, Math.max(min, n)); }
function tradeValue(record) { return finite(record?.primaryValue ?? record?.fobvalue ?? record?.cifvalue) ?? 0; }
function pickRecord(payload) { const data = payload?.data; if (!Array.isArray(data) || data.length === 0) return null; return data.find((x) => x?.isAggregate === false || x?.isAggregate == null) ?? data[0]; }
function hasData(payload) { return Array.isArray(payload?.data) && payload.data.length > 0; }
function growthPercent(previous, current) { if (previous === null || current === null || previous === 0) return null; return ((current - previous) / Math.abs(previous)) * 100; }
function growthSignal(previous, current) { const g = growthPercent(previous, current); return g === null ? 50 : clamp(50 + g * 2); }
function demandSignal(value) { return value <= 0 ? 0 : clamp(20 + Math.log10(value + 1) * 8); }
function marketGapSignal(imports, exports) { if (imports <= 0) return 0; if (exports <= 0) return 80; return clamp(80 - ((exports / imports) * 100) * 0.6); }
function availabilitySignal(importRecord, exportRecord) { return (importRecord ? 50 : 0) + (exportRecord ? 50 : 0); }
function buildUrl({ reporterCode, period, flowCode, partnerCode = 0, cmdCode, maxRecords = 5 }) { if (reporterCode == null || period == null || !flowCode || !cmdCode) throw new TypeError('REPORTER_PERIOD_FLOW_AND_COMMODITY_REQUIRED'); const url = new URL(API_BASE); url.searchParams.set('reportercode', String(reporterCode)); url.searchParams.set('period', String(period)); url.searchParams.set('flowCode', String(flowCode)); url.searchParams.set('partnerCode', String(partnerCode)); url.searchParams.set('cmdCode', String(cmdCode)); url.searchParams.set('maxRecords', String(Math.min(Math.max(Number(maxRecords) || 1, 1), 500))); url.searchParams.set('format', 'JSON'); return url; }
function retryAfterMs(response, fallback) { const seconds = Number(response?.headers?.get?.('retry-after')); return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : fallback; }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export async function fetchTradePreview({ reporterCode, period, flowCode, partnerCode = 0, cmdCode, maxRecords = 5, fetchImpl = globalThis.fetch, maxRetries = DEFAULT_MAX_RETRIES, retryDelayMs = DEFAULT_RETRY_DELAY_MS, sleepImpl = sleep } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('FETCH_IMPLEMENTATION_REQUIRED');
  const url = buildUrl({ reporterCode, period, flowCode, partnerCode, cmdCode, maxRecords });
  const retries = Math.max(0, Number(maxRetries) || 0);
  for (let attempt = 0; attempt <= retries; attempt += 1) { const response = await fetchImpl(url, { headers: { accept: 'application/json' } }); if (response.ok) { const payload = await response.json(); if (payload?.error) throw new Error(`COMTRADE_ERROR_${payload.error}`); return payload; } if (response.status !== 429 || attempt === retries) throw new Error(`COMTRADE_API_${response.status}`); await sleepImpl(retryAfterMs(response, retryDelayMs * (2 ** attempt))); }
  throw new Error('COMTRADE_RETRY_EXHAUSTED');
}

export function normalizeTradeRecord(payload) { const record = pickRecord(payload); if (!record) return null; return { period: String(record.period ?? record.refYear ?? ''), reporterCode: record.reporterCode ?? null, reporterISO: record.reporterISO ?? null, reporter: record.reporterDesc ?? '', flowCode: record.flowCode ?? '', partnerCode: record.partnerCode ?? null, partnerISO: record.partnerISO ?? null, partner: record.partnerDesc ?? '', cmdCode: record.cmdCode ?? '', product: record.cmdDesc ?? '', primaryValueUSD: tradeValue(record), netWeightKg: finite(record.netWgt), cifValueUSD: finite(record.cifvalue), fobValueUSD: finite(record.fobvalue), isReported: record.isReported !== false, original: record }; }

export function buildTradeOpportunity({ currentImports, previousImports, currentOriginExports, previousOriginExports, originMarket, targetMarket, productCode, observedAt = new Date().toISOString() }) {
  const importsNow = normalizeTradeRecord(currentImports); const importsBefore = normalizeTradeRecord(previousImports); const exportsNow = normalizeTradeRecord(currentOriginExports); const exportsBefore = normalizeTradeRecord(previousOriginExports); if (!importsNow || !exportsNow) return null;
  const targetImports = importsNow.primaryValueUSD; const targetImportsPrevious = importsBefore?.primaryValueUSD ?? null; const originExports = exportsNow.primaryValueUSD; const originExportsPrevious = exportsBefore?.primaryValueUSD ?? null;
  return { id: `comtrade-${originMarket}-${targetMarket}-${productCode}-${importsNow.period}`, category: 'comerç-internacional', productOrService: importsNow.product || `HS ${productCode}`, originMarket, targetMarket, source: { name: 'United Nations UN Comtrade', type: 'api', url: API_BASE }, observedAt, originalData: { imports: importsNow.original, importsPrevious: importsBefore?.original ?? null, originExportsToTarget: exportsNow.original, originExportsPrevious: exportsBefore?.original ?? null }, signals: { demand: demandSignal(targetImports), growth: growthSignal(targetImportsPrevious, targetImports), marketGap: marketGapSignal(targetImports, originExports), availability: availabilitySignal(importsNow, exportsNow) }, confidence: importsNow.isReported && exportsNow.isReported ? 0.9 : 0.75,
    // Public data access does NOT establish product-level legal eligibility.
    legal: { status: 'unknown', reason: 'Official UN Comtrade source confirmed; product-level commercial and regulatory eligibility requires dedicated legal review.', checkedAt: observedAt },
    commercial: { importValueUSD: targetImports, originExportsToTargetUSD: originExports, importGrowthPercent: growthPercent(targetImportsPrevious, targetImports), originExportGrowthPercent: growthPercent(originExportsPrevious, originExports), price: null, currency: 'USD', knownCosts: null } };
}

async function fetchPeriodPair({ originReporterCode, targetReporterCode, targetPartnerCode, productCode, currentPeriod, previousPeriod, fetchImpl, maxRetries, retryDelayMs, requestSpacingMs, sleepImpl }) {
  const requestOptions = { fetchImpl, maxRetries, retryDelayMs, sleepImpl };
  const requests = [
    { reporterCode: targetReporterCode, period: currentPeriod, flowCode: 'M', partnerCode: targetPartnerCode },
    { reporterCode: targetReporterCode, period: previousPeriod, flowCode: 'M', partnerCode: targetPartnerCode },
    { reporterCode: originReporterCode, period: currentPeriod, flowCode: 'X', partnerCode: targetReporterCode },
    { reporterCode: originReporterCode, period: previousPeriod, flowCode: 'X', partnerCode: targetReporterCode },
  ];
  const responses = [];
  for (const request of requests) {
    responses.push(await fetchTradePreview({ ...request, cmdCode: productCode, ...requestOptions }));
    const spacing = Math.max(0, Number(requestSpacingMs) || 0);
    if (spacing > 0 && responses.length < requests.length) await sleepImpl(spacing);
  }
  return responses;
}

export async function getTradeOpportunity({ originReporterCode, targetReporterCode, originMarket = String(originReporterCode), targetMarket = String(targetReporterCode), targetPartnerCode = 0, productCode, currentPeriod, previousPeriod, observedAt, fetchImpl = globalThis.fetch, maxRetries, retryDelayMs, requestSpacingMs = DEFAULT_REQUEST_SPACING_MS, sleepImpl = sleep, periodLookback = DEFAULT_PERIOD_LOOKBACK } = {}) {
  if (currentPeriod == null || previousPeriod == null) throw new TypeError('TRADE_PERIODS_REQUIRED');
  const lookback = Math.max(0, Number(periodLookback) || 0);
  let lastResponses = null;
  for (let offset = 0; offset <= lookback; offset += 1) {
    const current = Number(currentPeriod) - offset;
    const previous = Number(previousPeriod) - offset;
    const responses = await fetchPeriodPair({ originReporterCode, targetReporterCode, targetPartnerCode, productCode, currentPeriod: current, previousPeriod: previous, fetchImpl, maxRetries, retryDelayMs, requestSpacingMs, sleepImpl });
    lastResponses = responses;
    if (responses.every(hasData)) {
      return buildTradeOpportunity({ currentImports: responses[0], previousImports: responses[1], currentOriginExports: responses[2], previousOriginExports: responses[3], originMarket, targetMarket, productCode, observedAt });
    }
  }
  return buildTradeOpportunity({ currentImports: lastResponses?.[0], previousImports: lastResponses?.[1], currentOriginExports: lastResponses?.[2], previousOriginExports: lastResponses?.[3], originMarket, targetMarket, productCode, observedAt });
}
export default { fetchTradePreview, normalizeTradeRecord, buildTradeOpportunity, getTradeOpportunity };
