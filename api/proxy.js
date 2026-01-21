import axios from 'axios';

export default async function handler(req, res) {
    // path is injected via vercel.json rewrite: /api/proxy?path=uaf/login/index.php
    const { path } = req.query;

    if (!path) {
        return res.status(400).json({ error: 'No path provided' });
    }

    // Determine target base
    let targetUrl = '';
    // Note: vercel rewrite capturing group "$1" does not include leading slash usually if matched against /api/(.*)
    // e.g. /api/uaf/login -> path="uaf/login"

    if (path.startsWith('legacy/')) {
        const relative = path.replace('legacy/', '');
        targetUrl = `http://121.52.152.24/${relative}`;
    } else if (path.startsWith('uaf/')) {
        const relative = path.replace('uaf/', '');
        targetUrl = `https://lms.uaf.edu.pk/${relative}`;
    } else {
        // Fallback or error
        return res.status(400).json({ error: 'Invalid API route', path });
    }

    // Reconstruct other query parameters (e.g. ?id=123)
    // req.query includes 'path' AND original query params.
    const queryParams = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'path') queryParams.append(key, value);
    });
    const queryString = queryParams.toString();
    if (queryString) {
        targetUrl += `?${queryString}`;
    }

    // Common Headers
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...(req.headers['content-type'] && { 'Content-Type': req.headers['content-type'] }),
        // Important: Host header should NOT be forwarded usually, let axios set it
    };

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: headers,
            data: req.body,
            maxRedirects: 5,
            validateStatus: () => true,
            responseType: 'arraybuffer'
        });

        if (response.headers['set-cookie']) {
            const cookies = response.headers['set-cookie'].map(c =>
                c.replace(/; Secure/gi, '').replace(/; SameSite=None/gi, '; SameSite=Lax')
            );
            res.setHeader('Set-Cookie', cookies);
        }

        res.setHeader('Cache-Control', 'no-store, max-age=0');
        // Forward Content-Type
        res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');

        res.status(response.status).send(response.data);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ error: 'Proxy Request Failed', details: error.message, target: targetUrl });
    }
}
