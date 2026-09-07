// Run with: node --test tests/persistence-regressions.cjs
// Uses mocked I/O only: no database, credentials, network, or paid API calls.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const compile = source => ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const quiet = { log() {}, warn() {}, error() {} };

function load(file, mocks = {}) {
    const exports = {};
    vm.runInNewContext(compile(read(file)), {
        exports, URL, console: quiet,
        require(name) {
            if (Object.hasOwn(mocks, name)) return mocks[name];
            if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
            throw new Error(`Unmocked dependency: ${name}`);
        }
    });
    return exports;
}

function vault() {
    const source = read('src/components/VaultManager.tsx');
    const section = source.split('// --- Persistence & Debouncing ---')[1].split('// --- Project Actions ---')[0];
    const requests = [];
    const states = {};
    const api = vm.runInNewContext(compile(section + '\n({queueProjectsSave, queueLyricsSave, flushVault, handleManualSave});'), {
        useRef: value => ({ current: value }), useEffect() {},
        hasUnsavedChanges: true, console: quiet,
        setTimeout: () => 1, clearTimeout() {},
        setHasUnsavedChanges: value => { states.unsaved = value; },
        setIsSaving: value => { states.saving = value; },
        setNotice: value => { states.notice = value; },
        fetch: (_url, options) => new Promise(resolve => requests.push({ body: JSON.parse(options.body), resolve }))
    });
    return { ...api, requests, states };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

for (const type of ['Projects', 'Lyrics']) {
    test(`Vault serializes ${type} edits arriving during autosave/manual save`, async () => {
        const v = vault();
        v[`queue${type}Save`]([{ id: 'A' }]);
        const saving = v.flushVault();
        v[`queue${type}Save`]([{ id: 'B' }]);
        const manual = v.handleManualSave();
        assert.equal(v.requests.length, 1);
        v.requests[0].resolve({ ok: true });
        await tick();
        assert.equal(v.requests.length, 2);
        assert.equal(v.requests[1].body.payload[0].id, 'B');
        assert.equal(v.states.unsaved, true);
        v.requests[1].resolve({ ok: true });
        await Promise.all([saving, manual]);
        assert.equal(v.states.unsaved, false);
        assert.equal(v.states.saving, false);
    });
}

test('Vault keeps failed saves pending and retries the latest edit', async () => {
    const v = vault();
    v.queueProjectsSave([{ id: 'A' }]);
    const failed = v.flushVault();
    v.queueProjectsSave([{ id: 'B' }]);
    v.requests[0].resolve({ ok: false, status: 500 });
    await assert.rejects(failed);
    assert.equal(v.states.unsaved, true);
    assert.equal(v.states.notice.type, 'error');
    const retry = v.handleManualSave();
    assert.equal(v.requests[1].body.payload[0].id, 'B');
    v.requests[1].resolve({ ok: true });
    await retry;
    assert.equal(v.states.unsaved, false);
});

test('Vault failed/invalid initial loads cannot initialize editable collections', async () => {
    const source = read('src/components/VaultManager.tsx').split('// --- Data Loading ---')[1].split('// --- Persistence & Debouncing ---')[0];
    for (const response of [{ ok: false }, { ok: true, json: async () => ({ error: 'bad shape' }) }]) {
        let loading, error = false, assigned = false, finished;
        const done = new Promise(resolve => { finished = resolve; });
        vm.runInNewContext(compile(source), {
            useEffect: callback => callback(), fetch: async () => response, console: quiet,
            setProjects: () => { assigned = true; }, setLyrics: () => { assigned = true; },
            setLoadError: value => { error = value; },
            setIsLoading: value => { loading = value; finished(); }
        });
        await done;
        assert.equal(error, true);
        assert.equal(loading, false);
        assert.equal(assigned, false);
    }
});

const adapter = load('src/lib/finance-sync.ts');
const current = {
    kpis: { dkLifetime: 12, lifetimeTotal: 99, totalStreams: 400 },
    stores: [{ store: 'Store', earnings: 12, streams: 400, perStream: 0.03 }],
    songs: [{ title: 'Song', earnings: 12, streams: 400 }],
    computedAt: '2026-09-07T00:00:00Z'
};
const legacy = {
    kpis: { totalRevenue: 12, totalStreams: 400 },
    byStore: [{ store: 'Store', earnings: 12, streams: 400, rate: 0.03 }],
    bySong: [{ title: 'Song', earnings: 12, streams: 400 }],
    savedAt: '2026-09-07T00:00:00Z'
};
for (const [name, analysis] of Object.entries({ current, legacy })) {
    test(`Finance loads ${name} Revenue schema and preserves newer Finance data`, async () => {
        let stored = { totals: { revenue: 5 }, persistedAt: '2026-09-01T00:00:00Z' };
        const api = load('src/app/api/analyze-finance/route.ts', {
            '@/lib/db': {
                getFinanceAnalysisAsync: async mode => { assert.equal(mode, 'factory'); return stored; },
                getRow: async key => { assert.equal(key, 'revenue_engine_factory'); return analysis; }
            }, '@/lib/finance-sync': adapter, '@google/genai': {}, '@/lib/intel': {}
        });
        const response = await api.GET({ url: 'http://local/api/analyze-finance?mode=factory' });
        assert.equal(response.status, 200);
        assert.equal(response.body.analysis.totals.revenue, 12);
        assert.equal(response.body.analysis.platforms[0].rate, 0.03);
        stored = { totals: { revenue: 20 }, persistedAt: '2026-09-08T00:00:00Z' };
        assert.equal((await api.GET({ url: 'http://local/api/analyze-finance?mode=factory' })).body.analysis.totals.revenue, 20);
    });
}

test('Revenue POST syncs actual schema into the selected Finance mode', async () => {
    let saved;
    const api = load('src/app/api/revenue-engine/route.ts', {
        '@/lib/db': {
            setRow: async key => assert.equal(key, 'revenue_engine_factory'),
            setFinanceAnalysisAsync: async (value, mode) => { saved = value; assert.equal(mode, 'factory'); }
        }, '@/lib/finance-sync': adapter
    });
    assert.equal((await api.POST({ json: async () => ({ mode: 'factory', analysis: current }) })).status, 200);
    assert.equal(saved.totals.revenue, 12); // Excludes unrelated FB earnings.
});

test('Finance persistence keeps Factory writes out of Kirbai main_db', async () => {
    const source = read('src/lib/db.ts');
    const functions = source.slice(source.indexOf('export async function setFinanceAnalysisAsync'), source.indexOf('export async function saveRoadmapAsync'));
    const exports = {};
    let main = { financeAnalysis: { totals: { revenue: 1 } } }, factory;
    vm.runInNewContext(compile(functions), {
        exports,
        getDbAsync: async () => main,
        saveDbAsync: async value => { main = value; },
        getRow: async key => { assert.equal(key, 'finance_analysis_factory'); return factory; },
        setRow: async (key, value) => { assert.equal(key, 'finance_analysis_factory'); factory = value; }
    });
    await exports.setFinanceAnalysisAsync({ totals: { revenue: 2 } }, 'factory');
    assert.equal((await exports.getFinanceAnalysisAsync('factory')).totals.revenue, 2);
    assert.equal((await exports.getFinanceAnalysisAsync()).totals.revenue, 1);
});
