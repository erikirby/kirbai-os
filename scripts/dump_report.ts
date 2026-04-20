import { getRoadmapAsync, getRow, getMissionsAsync, getPulseStateAsync } from '../src/lib/db';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function dump() {
    console.log('--- BRAND IDENTITY ---');
    console.log('Kirbai:', await getRow('brand_identity'));
    console.log('Factory:', await getRow('brand_identity_factory'));

    console.log('\n--- PULSE (ANALYTICS) ---');
    console.log('Kirbai Pulse:', await getPulseStateAsync('kirbai'));
    console.log('Factory Pulse:', await getPulseStateAsync('factory'));

    console.log('\n--- MISSIONS ---');
    console.log('Kirbai Missions:', await getMissionsAsync('kirbai'));
    console.log('Factory Missions:', await getMissionsAsync('factory'));

    console.log('\n--- ROADMAP ---');
    console.log('Kirbai Roadmap:', await getRoadmapAsync('kirbai'));
    console.log('Factory Roadmap:', await getRoadmapAsync('factory'));
}

dump().catch(console.error);
