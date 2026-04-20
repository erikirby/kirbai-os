import { getRoadmapAsync, getRow, getMissionsAsync, getPulseStateAsync } from '../src/lib/db';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function dump() {
    let out = '';
    const add = (str: string) => out += str + '\n';
    
    add('--- BRAND IDENTITY ---');
    add('Kirbai: ' + JSON.stringify(await getRow('brand_identity'), null, 2));
    add('Factory: ' + JSON.stringify(await getRow('brand_identity_factory'), null, 2));

    add('\n--- PULSE (ANALYTICS) ---');
    add('Kirbai Pulse: ' + JSON.stringify(await getPulseStateAsync('kirbai'), null, 2));
    add('Factory Pulse: ' + JSON.stringify(await getPulseStateAsync('factory'), null, 2));

    add('\n--- MISSIONS ---');
    const km = await getMissionsAsync('kirbai');
    const fm = await getMissionsAsync('factory');
    // slim down the missions for readability
    const slim = (m: any[]) => m?.map(x => ({ title: x.title, alias: x.alias, status: x.status, concept: x.conceptDescription }));
    add('Kirbai Missions: ' + JSON.stringify(slim(km), null, 2));
    add('Factory Missions: ' + JSON.stringify(slim(fm), null, 2));

    add('\n--- ROADMAP ---');
    add('Kirbai Roadmap: ' + JSON.stringify(await getRoadmapAsync('kirbai'), null, 2));
    add('Factory Roadmap: ' + JSON.stringify(await getRoadmapAsync('factory'), null, 2));

    fs.writeFileSync(path.join(__dirname, '../tmp/dump.txt'), out);
}

dump().catch(console.error);
