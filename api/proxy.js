import axios from 'axios';

export default async function handler(req, res) {
    const { path } = req.query;
    const isLegacy = req.url.includes('/api/legacy/');

    // Construct target URL
    let targetUrl = '';
    if (isLegacy) {
        // Legacy: http://121.52.152.24/
        // Strip /api/legacy prefix or handle path
        // If regex matches: /api/legacy/StudentDetail.aspx -> http://121.52.152.24/StudentDetail.aspx
        const cleanPath = req.url.replace('/api/legacy', '');
        targetUrl = `http://121.52.152.24${cleanPath}`;
    } else {
        // Main UAF: https://lms.uaf.edu.pk/
        // Regex: /api/uaf/login/index.php -> https://lms.uaf.edu.pk/login/index.php
        const cleanPath = req.url.replace('/api/uaf', '');
        targetUrl = `https://lms.uaf.edu.pk${cleanPath}`;
    }

    // Common Headers to mimic a real browser
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        // Forward Content-Type if POST
        ...(req.headers['content-type'] && { 'Content-Type': req.headers['content-type'] })
    };

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: headers,
            data: req.body, // Forward body for POST
            maxRedirects: 5,
            validateStatus: () => true, // Pass all statuses back to client
            responseType: 'arraybuffer' // Handle binary (images) or text
        });

        // Forward cookies if any (set-cookie)
        // Note: Vercel might strip some, but we try.
        // We sanitize them for SameSite policy if needed, but let's just pass raw first.
        if (response.headers['set-cookie']) {
            const cookies = response.headers['set-cookie'].map(c =>
                c.replace(/; Secure/gi, '').replace(/; SameSite=None/gi, '; SameSite=Lax')
            );
            res.setHeader('Set-Cookie', cookies);
        }

        // Set Cache-Control to avoid caching dynamic results
        res.setHeader('Cache-Control', 'no-store, max-age=0');

        // Forward Content-Type
        res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');

        res.status(response.status).send(response.data);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ error: 'Proxy Request Failed', details: error.message });
    }
}
