import axios from 'axios';
import https from 'https';
// We use a simple regex for token extraction, so we don't strictly need cheerio on server if we want to keep it light.
// But for Legacy ViewState, cheerio is helpful. We'll try regex for ViewState too if possible, or assume cheerio is available.
// Since cheerio is in package.json, we can import it.
import * as cheerio from 'cheerio';

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

const CONFIG = {
    LOGIN_URL: "http://lms.uaf.edu.pk/login/index.php",
    RESULT_URL: "http://lms.uaf.edu.pk/course/uaf_student_result.php",
    LEGACY_URL: "http://121.52.152.24/",
    LEGACY_DEFAULT: "http://121.52.152.24/default.aspx",
    LEGACY_DETAIL: "http://121.52.152.24/StudentDetail.aspx",
    TIMEOUT: 30000
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1'
};

async function fetchLMS(regNumber) {
    // 1. Get Login Page
    const loginRes = await axios.get(CONFIG.LOGIN_URL, {
        headers: HEADERS,
        httpsAgent
    });

    const cookies = loginRes.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    // Extract Token
    const tokenMatch = loginRes.data.match(/document\.getElementById\(['"]token['"]\)\.value\s*=\s*['"]([^'"]+)['"]/);
    const token = tokenMatch ? tokenMatch[1] : '';

    if (!token) throw new Error('Failed to extract LMS token');

    // 2. Post Result
    const formData = new URLSearchParams();
    formData.append('Register', regNumber);
    formData.append('token', token);

    const resultRes = await axios.post(CONFIG.RESULT_URL, formData, {
        headers: {
            ...HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'http://lms.uaf.edu.pk',
            'Referer': CONFIG.LOGIN_URL,
            'Cookie': cookieHeader
        },
        maxRedirects: 5,
        httpsAgent,
        timeout: CONFIG.TIMEOUT
    });

    return resultRes.data;
}

async function fetchLegacy(regNumber) {
    // 1. Get Default Page (to get ViewState)
    const initialRes = await axios.get(CONFIG.LEGACY_URL, {
        headers: HEADERS,
        httpsAgent
    });

    const $ = cheerio.load(initialRes.data);
    const viewstate = $('#__VIEWSTATE').val();
    const eventValidation = $('#__EVENTVALIDATION').val();
    const viewstateGenerator = $('#__VIEWSTATEGENERATOR').val();

    // Legacy cookies (ASP.NET_SessionId)
    const cookies = initialRes.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    if (!viewstate) throw new Error('Failed to extract Legacy ViewState');

    // 2. Post to Default
    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewstate);
    if (viewstateGenerator) formData.append('__VIEWSTATEGENERATOR', viewstateGenerator);
    formData.append('__EVENTVALIDATION', eventValidation);
    formData.append('ctl00$Main$txtReg', regNumber);
    formData.append('ctl00$Main$btnShow', 'Show');

    await axios.post(CONFIG.LEGACY_DEFAULT, formData, {
        headers: {
            ...HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader,
            'Origin': 'http://121.52.152.24',
            'Referer': CONFIG.LEGACY_DEFAULT
        },
        httpsAgent,
        maxRedirects: 5
    });

    // 3. Get Detail Page
    const detailRes = await axios.get(CONFIG.LEGACY_DETAIL, {
        headers: {
            ...HEADERS,
            'Cookie': cookieHeader,
            'Referer': CONFIG.LEGACY_DEFAULT
        },
        httpsAgent
    });

    return detailRes.data;
}

export default async function handler(req, res) {
    const { action, regNumber } = req.query;

    if (!regNumber) {
        return res.status(400).json({ error: 'Missing regNumber' });
    }

    try {
        let html = '';

        if (action === 'fetch_lms') {
            html = await fetchLMS(regNumber);
        } else if (action === 'fetch_legacy') {
            html = await fetchLegacy(regNumber);
        } else {
            return res.status(400).json({ error: 'Invalid action. Use fetch_lms or fetch_legacy' });
        }

        // Basic Validation
        if (!html || html.length < 100) {
            throw new Error('Empty response received');
        }

        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);

    } catch (error) {
        console.error('Proxy Action Error:', error.message);
        res.status(500).json({ error: 'Fetch Failed', details: error.message });
    }
}
