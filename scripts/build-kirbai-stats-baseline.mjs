#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const sourceDir = path.resolve(process.argv[2] || '/Users/erikhenry2/Desktop/KIRBAI POKEMON/stats');
const outputPath = path.resolve(
    process.argv[3] || path.join(projectRoot, 'data/vault/analytics/kirbai_stats_baseline.json')
);

function parseCsv(text) {
    const input = text.replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (quoted) {
            if (char === '"' && input[i + 1] === '"') {
                value += '"';
                i++;
            } else if (char === '"') {
                quoted = false;
            } else {
                value += char;
            }
        } else if (char === '"') {
            quoted = true;
        } else if (char === ',') {
            row.push(value);
            value = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && input[i + 1] === '\n') i++;
            row.push(value);
            if (row.some((cell) => cell !== '')) rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }

    if (value || row.length) {
        row.push(value);
        rows.push(row);
    }
    return rows;
}

function loadCsv(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const rows = parseCsv(text);
    const headers = rows[0] || [];
    const records = rows.slice(1).map((row) =>
        Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
    );
    return { text, headers, records };
}

const number = (value) => {
    const parsed = Number(String(value ?? '').replace(/[,$]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const isoDate = (value) => {
    const match = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? `${match[3]}-${match[1]}-${match[2]}` : null;
};

const max = (values) => values.filter(Boolean).sort().at(-1) ?? null;
const min = (values) => values.filter(Boolean).sort()[0] ?? null;
const round = (value, digits = 6) => Number(value.toFixed(digits));
const truncate = (value, maxLength = 240) => {
    const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
    return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
};

function sum(records, field) {
    return records.reduce((total, record) => total + number(record[field]), 0);
}

function group(records, keyField, measures) {
    const grouped = new Map();
    for (const record of records) {
        const key = record[keyField] || 'Unknown';
        const current = grouped.get(key) || { name: key };
        for (const measure of measures) {
            current[measure] = (current[measure] || 0) + number(record[measure]);
        }
        grouped.set(key, current);
    }
    return [...grouped.values()];
}

function summarizeMeta(records, platform) {
    const isInstagram = platform === 'instagram';
    const reactionField = isInstagram ? 'Likes' : 'Reactions';
    const validRecords = records.filter((record) => record['Post ID']);
    const videos = validRecords.filter((record) =>
        isInstagram ? record['Post type'] === 'IG reel' : record['Post type'] === 'Videos'
    );

    const topPosts = [...validRecords]
        .sort((a, b) => number(b.Views) - number(a.Views))
        .slice(0, 15)
        .map((record) => ({
            postId: record['Post ID'],
            publishDate: isoDate(record['Publish time']),
            type: record['Post type'],
            caption: truncate(record.Description || record.Title),
            permalink: record.Permalink,
            durationSeconds: number(record['Duration (sec)']),
            views: number(record.Views),
            reach: number(record.Reach),
            reactions: number(record[reactionField]),
            comments: number(record.Comments),
            shares: number(record.Shares),
            saves: number(record.Saves),
            follows: number(record.Follows),
            earningsUsd: number(record['Approximate content monetization earnings']),
        }));

    return {
        grain: 'One lifetime aggregate row per post ID.',
        coverage: {
            firstPublishDate: min(validRecords.map((record) => isoDate(record['Publish time']))),
            lastPublishDate: max(validRecords.map((record) => isoDate(record['Publish time']))),
            posts: validRecords.length,
            videos: videos.length,
            otherPosts: validRecords.length - videos.length,
        },
        totals: {
            views: sum(validRecords, 'Views'),
            reach: sum(validRecords, 'Reach'),
            reactions: sum(validRecords, reactionField),
            comments: sum(validRecords, 'Comments'),
            shares: sum(validRecords, 'Shares'),
            saves: sum(validRecords, 'Saves'),
            follows: sum(validRecords, 'Follows'),
            earningsUsd: round(sum(validRecords, 'Approximate content monetization earnings')),
        },
        topPosts,
    };
}

function summarizeDistroKid(records) {
    const kirbai = records.filter((record) => record.Artist === 'Kirbai');
    const exactKeys = new Set();
    const deduplicated = [];
    for (const record of kirbai) {
        const key = Object.values(record).join('\u241f');
        if (!exactKeys.has(key)) deduplicated.push(record);
        exactKeys.add(key);
    }

    const measures = ['Quantity', 'Earnings (USD)', 'Songwriter Royalties Withheld (USD)'];
    const rank = (field, limit) => group(kirbai, field, measures)
        .sort((a, b) => b['Earnings (USD)'] - a['Earnings (USD)'])
        .slice(0, limit)
        .map((item) => ({
            name: item.name,
            quantity: item.Quantity,
            earningsUsd: round(item['Earnings (USD)']),
            songwriterRoyaltiesWithheldUsd: round(item['Songwriter Royalties Withheld (USD)']),
        }));

    const totals = (rows) => ({
        quantity: sum(rows, 'Quantity'),
        earningsUsd: round(sum(rows, 'Earnings (USD)')),
        songwriterRoyaltiesWithheldUsd: round(sum(rows, 'Songwriter Royalties Withheld (USD)')),
    });

    return {
        grain: 'DistroKid royalty ledger row by reporting batch, sale month, store, track, release ID, source type, and country; no transaction ID is present.',
        coverage: {
            firstSaleMonth: min(kirbai.map((record) => record['Sale Month'])),
            lastSaleMonth: max(kirbai.map((record) => record['Sale Month'])),
            firstReportingDate: min(kirbai.map((record) => record['Reporting Date'])),
            lastReportingDate: max(kirbai.map((record) => record['Reporting Date'])),
            ledgerRows: kirbai.length,
            tracks: new Set(kirbai.map((record) => record.Title)).size,
            stores: new Set(kirbai.map((record) => record.Store)).size,
            countries: new Set(kirbai.map((record) => record['Country of Sale'])).size,
        },
        totals: totals(kirbai),
        deduplicatedSensitivity: {
            exactDuplicateRows: kirbai.length - deduplicated.length,
            totalsIfExactDuplicatesRemoved: totals(deduplicated),
            rule: 'Official totals retain every exported row because the file has no transaction ID. The deduplicated figure is a sensitivity check only.',
        },
        topStores: rank('Store', 12),
        topTracks: rank('Title', 25),
        topCountries: rank('Country of Sale', 12),
        saleMonths: rank('Sale Month', 36).sort((a, b) => a.name.localeCompare(b.name)),
        reportingCaveat: 'DistroKid data arrives late. The newest sale month is likely incomplete and should not be compared directly with mature months.',
    };
}

if (!fs.existsSync(sourceDir)) {
    throw new Error(`Stats source directory not found: ${sourceDir}`);
}

const csvFiles = fs.readdirSync(sourceDir)
    .filter((name) => name.toLowerCase().endsWith('.csv'))
    .sort()
    .map((name) => {
        const filePath = path.join(sourceDir, name);
        const loaded = loadCsv(filePath);
        return {
            name,
            path: filePath,
            checksumSha256: crypto.createHash('sha256').update(loaded.text).digest('hex'),
            ...loaded,
        };
    });

const instagramFiles = csvFiles.filter((file) =>
    file.headers.includes('Account username') && file.headers.includes('Post ID')
);
const facebookFiles = csvFiles.filter((file) =>
    file.headers.includes('Page ID') && file.headers.includes('Post ID')
);
const distroKidFiles = csvFiles.filter((file) =>
    file.headers.includes('Sale Month') && file.headers.includes('Earnings (USD)')
);

if (!instagramFiles.length || !facebookFiles.length || !distroKidFiles.length) {
    throw new Error('Expected at least one Instagram, Facebook, and DistroKid CSV export.');
}

// Sort platform files by their max publish date (or file record dates) chronologically (oldest -> newest)
function getFileMaxDate(file) {
    const dates = file.records.map((r) => isoDate(r['Publish time'])).filter(Boolean);
    return dates.sort().at(-1) || file.name;
}

function mergeMetaFiles(files) {
    const sortedFiles = [...files].sort((a, b) => getFileMaxDate(a).localeCompare(getFileMaxDate(b)));
    const postsMap = new Map();
    for (const file of sortedFiles) {
        for (const record of file.records) {
            const postId = record['Post ID'];
            if (postId) {
                // If post already exists, overwrite with newer record's metrics
                // If post is only in older export, keep the older record intact
                postsMap.set(postId, record);
            }
        }
    }
    return {
        mergedRows: [...postsMap.values()],
        rawRowsCount: files.reduce((sum, f) => sum + f.records.length, 0),
    };
}

const { mergedRows: instagramRows, rawRowsCount: instagramRawRows } = mergeMetaFiles(instagramFiles);
const { mergedRows: facebookRows, rawRowsCount: facebookRawRows } = mergeMetaFiles(facebookFiles);

const distroKidRows = distroKidFiles.flatMap((file) => file.records);

const instagram = summarizeMeta(instagramRows, 'instagram');
const facebook = summarizeMeta(facebookRows, 'facebook');
const distroKid = summarizeDistroKid(distroKidRows);

const usd = (value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const count = (value) => Number(value).toLocaleString('en-US');

const baseline = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'Historical baseline; refresh from the source folder before claiming metrics are current.',
    sourceDirectory: sourceDir,
    sources: csvFiles.map((file) => ({
        fileName: file.name,
        absolutePath: file.path,
        checksumSha256: file.checksumSha256,
        rows: file.records.length,
        columns: file.headers.length,
        detectedType: instagramFiles.includes(file)
            ? 'instagram'
            : facebookFiles.includes(file)
                ? 'facebook'
                : distroKidFiles.includes(file)
                    ? 'distrokid'
                    : 'unknown',
    })),
    instagram,
    facebook,
    distroKid,
    baselineSignals: [
        `The top Instagram post in this export is “${instagram.topPosts[0]?.caption}” with ${count(instagram.topPosts[0]?.views)} views and ${count(instagram.topPosts[0]?.shares)} shares.`,
        `The top Facebook post in this export is “${facebook.topPosts[0]?.caption}” with ${count(facebook.topPosts[0]?.views)} views and ${usd(facebook.topPosts[0]?.earningsUsd)} in native earnings.`,
        `DistroKid reports ${usd(distroKid.totals.earningsUsd)} across ${count(distroKid.totals.quantity)} reported units for Kirbai through sale month ${distroKid.coverage.lastSaleMonth}; the newest month may be incomplete.`,
        `The leading DistroKid stores by earnings are ${distroKid.topStores.slice(0, 3).map((item) => `${item.name} (${usd(item.earningsUsd)})`).join(', ')}.`,
        `The leading tracks by DistroKid earnings are ${distroKid.topTracks.slice(0, 5).map((item) => `${item.name} (${usd(item.earningsUsd)})`).join(', ')}.`,
    ],
    dataQuality: {
        instagram: {
            severity: 'low',
            rawRowsAcrossExports: instagramRawRows,
            uniquePostIds: instagramRows.length,
            overlappingRowsNotDoubleCounted: instagramRawRows - instagramRows.length,
            finding: 'The July 17 Instagram export fully supersedes the overlapping July 6 export. Baseline totals use one row per post ID.',
        },
        facebook: {
            severity: 'low',
            rows: facebookRows.length,
            uniquePostIds: new Set(facebookRows.map((record) => record['Post ID']).filter(Boolean)).size,
            finding: 'The export mixes videos and photo posts. Totals include both; the coverage block separates video count.',
        },
        distroKid: {
            severity: 'medium',
            finding: 'The ledger contains a small number of exact duplicate-looking rows, but there is no transaction ID proving they are accidental duplicates. Official totals therefore retain them and expose a deduplicated sensitivity check.',
        },
    },
    usageRules: [
        'Treat this file as a dated baseline, not live analytics.',
        'Use Pulse and Revenue Engine when they contain a newer import.',
        'Do not add overlapping Instagram exports together; deduplicate by Post ID.',
        'Keep Kirbai separate from Kirby Henry, AELOW, and KURAO when discussing artist performance.',
        'Label royalty figures with reporting coverage and warn that the newest sale month may be incomplete.',
        'DistroKid Quantity means reported units and can include social-media uses, downloads, or other source types; do not relabel the total as streams.',
        'Never infer causation from a high-performing post or track without a controlled comparison.',
    ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
