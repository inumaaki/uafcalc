import axios from 'axios';
import https from 'https';

// HTTPS Agent to ignore SSL errors (Crucial Configuration)
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

const CONFIG = {
    LOGIN_URL: "https://lms.uaf.edu.pk/login/index.php",
    RESULT_URL: "https://lms.uaf.edu.pk/course/uaf_student_result.php",
    LEGACY_URL: "http://121.52.152.24/",
    LEGACY_DEFAULT: "http://121.52.152.24/default.aspx",
    LEGACY_DETAIL: "http://121.52.152.24/StudentDetail.aspx",
    TIMEOUT: 60000
};

// Headers for Result Fetching (Mac/Chrome 139) - As per user instruction
const RESULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1'
};

// Headers for Attendance/Legacy Fetching (Windows/Chrome 91)
const LEGACY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1'
};

async function fetchLMS(regNumber) {
    // 1. Get Login Page
    const loginRes = await axios.get(CONFIG.LOGIN_URL, {
        headers: RESULT_HEADERS,
        httpsAgent,
        validateStatus: () => true
    });

    const cookies = loginRes.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    // Extract Token (Regex)
    const tokenMatch = loginRes.data.match(/document\.getElementById\(['"]token['"]\)\.value\s*=\s*['"]([^'"]+)['"]/);
    const token = tokenMatch ? tokenMatch[1] : '';

    if (!token) throw new Error('Failed to extract LMS token');

    // 2. Post Result
    const formData = new URLSearchParams();
    formData.append('Register', regNumber);
    formData.append('token', token);

    const resultRes = await axios.post(CONFIG.RESULT_URL, formData, {
        headers: {
            ...RESULT_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://lms.uaf.edu.pk',
            'Referer': CONFIG.LOGIN_URL,
            'Cookie': cookieHeader
        },
        maxRedirects: 5,
        httpsAgent,
        timeout: CONFIG.TIMEOUT,
        validateStatus: () => true,
        withCredentials: true
    });

    return resultRes.data;
}

async function fetchLegacy(regNumber) {
    // 1. Get Default Page (Initial) to get ViewState
    const initialRes = await axios.get(CONFIG.LEGACY_URL, {
        headers: LEGACY_HEADERS,
        httpsAgent,
        validateStatus: () => true,
        timeout: CONFIG.TIMEOUT
    });

    if (initialRes.status !== 200) throw new Error(`Legacy initial fetch failed: ${initialRes.status}`);

    const viewstateMatch = initialRes.data.match(/id="__VIEWSTATE" value="([^"]+)"/);
    const viewstate = viewstateMatch ? viewstateMatch[1] : '';

    const eventValidationMatch = initialRes.data.match(/id="__EVENTVALIDATION" value="([^"]+)"/);
    const eventValidation = eventValidationMatch ? eventValidationMatch[1] : '';

    const generatorMatch = initialRes.data.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
    const viewstateGenerator = generatorMatch ? generatorMatch[1] : '';

    if (!viewstate) throw new Error('Failed to extract Legacy ViewState');

    // 2. Post to Default
    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewstate);
    if (viewstateGenerator) formData.append('__VIEWSTATEGENERATOR', viewstateGenerator);
    formData.append('__EVENTVALIDATION', eventValidation);
    formData.append('ctl00$Main$txtReg', regNumber);
    formData.append('ctl00$Main$btnShow', 'Show');

    // Reference Logic: Expect 302, Max Redirects 0
    const postRes = await axios.post(CONFIG.LEGACY_DEFAULT, formData, {
        headers: {
            ...LEGACY_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': CONFIG.LEGACY_URL, // .24
            'Referer': CONFIG.LEGACY_URL // .24
        },
        httpsAgent,
        maxRedirects: 0, // CRITICAL: Stop at redirect to capture cookie
        validateStatus: (status) => status === 302, // Accept only 302
        timeout: CONFIG.TIMEOUT
    });

    // Capture Session Cookie from POST response
    const sessionCookies = postRes.headers['set-cookie'];
    if (!sessionCookies || sessionCookies.length === 0) {
        throw new Error('No session cookie found in Legacy POST response');
    }
    const sessionCookieHeader = sessionCookies.map(c => c.split(';')[0]).join('; ');

    // 3. Get Detail Page
    const detailRes = await axios.get(CONFIG.LEGACY_DETAIL, {
        headers: {
            ...LEGACY_HEADERS,
            'Cookie': sessionCookieHeader, // Use the NEW cookie
            'Referer': CONFIG.LEGACY_DEFAULT
        },
        httpsAgent,
        validateStatus: () => true,
        timeout: CONFIG.TIMEOUT
    });

    if (detailRes.status !== 200) throw new Error(`Legacy detail fetch failed: ${detailRes.status}`);

    return detailRes.data;
}

export default async function handler(req, res) {
    const { action, regNumber } = req.query;

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
            throw new Error('Empty response received');
        }

        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({
            error: 'Fetch Failed',
            details: error.message,
            stack: error.stack
        });
    }
}
