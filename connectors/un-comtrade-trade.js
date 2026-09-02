/**
 * NEWBASE connector: UN Comtrade public preview API.
 *
 * Uses only the official, unauthenticated preview endpoint. No scraping,
 * credentials, paid service or affiliate flow is required.
 *
 * The preview API is intentionally used for small, targeted queries. Results
 * remain evidence, not proof of profitability, retail demand or legal eligibility.
 */

const API_BASE = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1500;
const DEFAULT_REQUEST_SPACING_MS = 1000;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min = 0, max = 100) {
  const number = finite(value);
  if (number === null) return min;
  return Math.min(max, Math.max(min, number));
}

function tradeValue(record) {
  return finite(record?.primaryValue ?? record?.fobvalue ?? record?.cifvalue) ?? 0;
}

function pickRecord(payload) {
  const data = payload?.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.find((item) => item?.isAggregate === false || item?.isAggregate == null) ?? data[0];
}

function growthPercent(previous, current) {
  if (previous === null || current === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function growthSignal(previous, current) {
  const growth = growthPercent(previous, current);
  if (growth === null) return 50;
  return clamp(50 + growth * 2);
}

function demandSignal(importValue) {
  if (importValue <= 0) return 0;
  return clamp(20 + Math.log10(importValue + 1) * 8);
}

function marketGapSignal(targetImports, originExportsToTarget) {
  if (targetImports <= 0) return 0;
  if (originExportsToTarget <= 0) return 80;
  const coverage = (originExportsToTarget / targetImports) * 100;
  return clamp(80 - coverage * 0.6);
}

function availabilitySignal(importRecord, exportRecord) {
  let score = 0;
  if (importRecord) score += 50;
  if (exportRecord) score += 50;
  return score;
}

function buildUrl({ reporterCode, period, flowCode, partnerCode = 0, cmdCode, maxRecords = 5 }) {
  if (reporterCode == null || period == null || !flowCode || !cmdCode) {
    throw new TypeError('REPORTER_PERIOD_FLOW_AND_COMMODITY_REQUIRED');
  }

  const url = new URL(API_BASE);
  url.searchParams.set('reportercode', String(reporterCode));
  url.searchParams.set('period', String(period));
  url.searchParams.set('flowCode', String(flowCode));
  url.searchParams.set('partnerCode', String(partnerCode));
  url.searchParams.set('cmdCode', String(cmdCode));
  url.searchParams.set('maxRecords', String(Math.min(Math.max(Number(maxRecords) || 1, 1), 500)));
  url.searchParams.set('format', 'JSON');
  return url;
}

function retryAfterMs(response, fallback) {
  const value = response?.headers?.get?.('retry-after');
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTradePreview({
  reporterCode,
  period,
  flowCode,
  partnerCode = 0,
  cmdCode,
  maxRecords = 5,
  fetchImpl = globalThis.fetch,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  sleepImpl = sleep,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('FETCH_IMPLEMENTATION_REQUIRED');

  const url = buildUrl({ reporterCode, period, flowCode, partnerCode, cmdCode, maxRecords });
  const retries = Math.max(0, Number(maxRetries) || 0);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } });

    if (response.ok) {
      const payload = await response.json();
      if (payload?.error) throw new Error(`COMTRADE_ERROR_${payload.error}`);
      return payload;
    }

    if (response.status !== 429 || attempt === retries) {
      throw new Error(`COMTRADE_API_${response.status}`);
    }

    const delay = retryAfterMs(response, retryDelayMs * (2 ** attempt));
    await sleepImpl(delay);
  }

  throw new Error('COMTRADE_RETRY_EXHAUSTED');
}

export function normalizeTradeRecord(payload) {
  const record = pickRecord(payload);
  if (!record) return null;

  return {
    period: String(record.period ?? record.refYear ?? ''),
    reporterCode: record.reporterCode ?? null,
    reporterISO: record.reporterISO ?? null,
    reporter: record.reporterDesc ?? '',
    flowCode: record.flowCode ?? '',
    partnerCode: record.partnerCode ?? null,
    partnerISO: record.partnerISO ?? null,
    partner: record.partnerDesc ?? '',
    cmdCode: record.cmdCode ?? '',
    product: record.cmdDesc ?? '',
    primaryValueUSD: tradeValue(record),
    netWeightKg: finite(record.netWgt),
    cifValueUSD: finite(record.cifvalue),
    fobValueUSD: finite(record.fobvalue),
    isReported: record.isReported !== false,
    original: record,
  };
}

export function buildTradeOpportunity({
  currentImports,
  previousImports,
  currentOriginExports,
  previousOriginExports,
  originMarket,
  targetMarket,
  productCode,
  observedAt = new Date().toISOString(),
}) {
  const importsNow = normalizeTradeRecord(currentImports);
  const importsBefore = normalizeTradeRecord(previousImports);
  const exportsNow = normalizeTradeRecord(currentOriginExports);
  const exportsBefore = normalizeTradeRecord(previousOriginExports);

  if (!importsNow || !exportsNow) return null;

  const targetImports = importsNow.primaryValueUSD;
  const targetImportsPrevious = importsBefore?.primaryValueUSD ?? null;
  const originExports = exportsNow.primaryValueUSD;
  const originExportsPrevious = exportsBefore?.primaryValueUSD ?? null;

  const importGrowth = growthPercent(targetImportsPrevious, targetImports);
  const exportGrowth = growthPercent(originExportsPrevious, originExports);
  const demand = demandSignal(targetImports);
  const growth = growthSignal(targetImportsPrevious, targetImports);
  const marketGap = marketGapSignal(targetImports, originExports);
  const availability = availabilitySignal(importsNow, exportsNow);

  return {
    id: `comtrade-${originMarket}-${targetMarket}-${productCode}-${importsNow.period}`,
    category: 'comerç-internacional',
    productOrService: importsNow.product || `HS ${productCode}`,
    originMarket,
    targetMarket,
    source: {
      name: 'United Nations UN Comtrade',
      type: 'api',
      url: API_BASE,
    },
    observedAt,
    originalData: {
      imports: importsNow.original,
      importsPrevious: importsBefore?.original ?? null,
      originExportsToTarget: exportsNow.original,
      originExportsPrevious: exportsBefore?.original ?? null,
    },
    signals: {
      demand,
      growth,
      marketGap,
      availability,
    },
    confidence: importsNow.isReported && exportsNow.isReported ? 0.9 : 0.75,
    legal: {
      status: 'allowed',
      reason: 'Official UN Comtrade public preview API; source terms and downstream product regulation still require review.',
      checkedAt: observedAt,
    },
    commercial: {
      importValueUSD: targetImports,
      originExportsToTargetUSD: originExports,
      importGrowthPercent: importGrowth,
      originExportGrowthPercent: exportGrowth,
      price: null,
      currency: 'USD',
      knownCosts: null,
    },
  };
}

export async function getTradeOpportunity({
  originReporterCode,
  targetReporterCode,
  originMarket = String(originReporterCode),
  targetMarket = String(targetReporterCode),
  targetPartnerCode = 0,
  productCode,
  currentPeriod,
  previousPeriod,
  observedAt,
  fetchImpl = globalThis.fetch,
  maxRetries,
  retryDelayMs,
  requestSpacingMs = DEFAULT_REQUEST_SPACING_MS,
  sleepImpl = sleep,
} = {}) {
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

  return buildTradeOpportunity({
    currentImports: responses[0],
    previousImports: responses[1],
    currentOriginExports: responses[2],
    previousOriginExports: responses[3],
    originMarket,
    targetMarket,
    productCode,
    observedAt,
  });
}

export default {
  fetchTradePreview,
  normalizeTradeRecord,
  buildTradeOpportunity,
  getTradeOpportunity,
};
