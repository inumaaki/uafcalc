import axios from 'axios';
import https from 'https';

// HTTPS Agent to ignore SSL errors (crucial for UAF)
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// URLs MUST be HTTPS
const CONFIG = {
    LOGIN_URL: "https://lms.uaf.edu.pk/login/index.php",
    RESULT_URL: "https://lms.uaf.edu.pk/course/uaf_student_result.php",
    // Legacy is usually HTTP
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
    console.log(`[LMS] Fetching Login Page: ${CONFIG.LOGIN_URL}`);

    // 1. Get Login Page
    const loginRes = await axios.get(CONFIG.LOGIN_URL, {
        headers: HEADERS,
        httpsAgent,
        validateStatus: () => true
    });

    if (loginRes.status !== 200) {
        throw new Error(`Login page failed with status ${loginRes.status}`);
    }

    const cookies = loginRes.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    // Extract Token (Regex)
    // Pattern: document.getElementById('token').value = '...';
    // We use a robust regex to catch single or double quotes
    const tokenMatch = loginRes.data.match(/document\.getElementById\(['"]token['"]\)\.value\s*=\s*['"]([^'"]+)['"]/);
    const token = tokenMatch ? tokenMatch[1] : '';

    if (!token) {
        console.error('[LMS] Token not found in login page HTML');
        // console.debug(loginRes.data.substring(0, 500)); // Log regex target area if needed
        throw new Error('Failed to extract LMS token');
    }

    console.log(`[LMS] Token extracted. Posting to ${CONFIG.RESULT_URL} with reg: ${regNumber}`);

    // 2. Post Result
    const formData = new URLSearchParams();
    formData.append('Register', regNumber);
    formData.append('token', token);

    const resultRes = await axios.post(CONFIG.RESULT_URL, formData, {
        headers: {
            ...HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://lms.uaf.edu.pk',
            'Referer': CONFIG.LOGIN_URL,
            'Cookie': cookieHeader
        },
        maxRedirects: 5,
        httpsAgent,
        timeout: CONFIG.TIMEOUT,
        validateStatus: () => true
    });

    if (resultRes.status !== 200) {
        throw new Error(`Result page failed with status ${resultRes.status}`);
    }

    return resultRes.data;
}

async function fetchLegacy(regNumber) {
    console.log(`[Legacy] Fetching Default Page: ${CONFIG.LEGACY_URL}`);

    // 1. Get Default Page (to get ViewState)
    const initialRes = await axios.get(CONFIG.LEGACY_URL, {
        headers: HEADERS,
        httpsAgent, // Even if it's HTTP, agent is safer or ignored
        validateStatus: () => true
    });

    if (initialRes.status !== 200) throw new Error(`Legacy initial fetch failed: ${initialRes.status}`);

    // Regex for ViewState
    const viewstateMatch = initialRes.data.match(/id="__VIEWSTATE" value="([^"]+)"/);
    const viewstate = viewstateMatch ? viewstateMatch[1] : '';

    const eventValidationMatch = initialRes.data.match(/id="__EVENTVALIDATION" value="([^"]+)"/);
    const eventValidation = eventValidationMatch ? eventValidationMatch[1] : '';

    const generatorMatch = initialRes.data.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
    const viewstateGenerator = generatorMatch ? generatorMatch[1] : '';

    if (!viewstate) throw new Error('Failed to extract Legacy ViewState');

    // Cookies
    const cookies = initialRes.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    console.log(`[Legacy] Posting Form...`);

    // 2. Post to Default
    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewstate);
    if (viewstateGenerator) formData.append('__VIEWSTATEGENERATOR', viewstateGenerator);
    formData.append('__EVENTVALIDATION', eventValidation);
    formData.append('ctl00$Main$txtReg', regNumber);
    formData.append('ctl00$Main$btnShow', 'Show');

    // Headers for POST
    const postHeaders = {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
        'Origin': 'http://121.52.152.24',
        'Referer': CONFIG.LEGACY_DEFAULT
    };

    const postRes = await axios.post(CONFIG.LEGACY_DEFAULT, formData, {
        headers: postHeaders,
        httpsAgent,
        maxRedirects: 5,
        validateStatus: () => true
    });

    if (postRes.status !== 200 && postRes.status !== 302) {
        // 302 is common in ASP.NET after post, but here we expect content or redirect 
        throw new Error(`Legacy POST failed: ${postRes.status}`);
    }

    // Capture NEW Cookies from POST response (Critical!)
    // ASP.NET often sets the SessionId or specialized cookie here
    const postCookies = postRes.headers['set-cookie'];
    let detailCookieHeader = cookieHeader; // Default to initial if no new ones

    if (postCookies && postCookies.length > 0) {
        // We should merge or replace. Usually replacing is fine or improved merging.
        // Let's use the new ones as primary for the session.
        detailCookieHeader = postCookies.map(c => c.split(';')[0]).join('; ');
    }

    console.log(`[Legacy] POST success. Fetching Detail with cookies: ${detailCookieHeader.substring(0, 20)}...`);

    // 3. Get Detail Page
    const detailRes = await axios.get(CONFIG.LEGACY_DETAIL, {
        headers: {
            ...HEADERS,
            'Cookie': detailCookieHeader, // USE NEW COOKIES
            'Referer': CONFIG.LEGACY_DEFAULT
        },
        httpsAgent,
        validateStatus: () => true
    });

    if (detailRes.status !== 200) throw new Error(`Legacy detail fetch failed: ${detailRes.status}`);

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
            return res.status(400).json({ error: `Invalid action: ${action}` });
        }

        if (!html || html.length < 100) {
            throw new Error('Empty response received from scraped page');
        }

        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);

    } catch (error) {
        console.error('Proxy Fatal Error:', error.message);
        // Return error details to client for debugging
        res.status(500).json({
            error: 'Fetch Failed',
            details: error.message,
            stack: error.stack
        });
    }
}
