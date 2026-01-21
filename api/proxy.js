
import { createProxyMiddleware } from 'http-proxy-middleware';

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};

// Map paths to targets
const TARGETS = {
    '/api/uaf': 'https://lms.uaf.edu.pk',
    '/api/legacy': 'http://121.52.152.24'
};
// Fallback for user mention of .19? stick to known working .24

export default function handler(req, res) {
    // Determine target based on path
    let target = '';
    let pathRewrite = {};

    if (req.url.startsWith('/api/uaf')) {
        target = TARGETS['/api/uaf'];
        pathRewrite = { '^/api/uaf': '' };
    } else if (req.url.startsWith('/api/legacy')) {
        target = TARGETS['/api/legacy'];
        pathRewrite = { '^/api/legacy': '' };
    } else {
        res.status(404).json({ error: 'Unknown proxy target' });
        return;
    }

    // Create proxy
    const proxy = createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite,
        secure: false, // For legacy HTTP and potentially self-signed HTTPS
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        },
        onProxyRes: (proxyRes) => {
            // Fix cookies
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
                proxyRes.headers['set-cookie'] = cookies.map(cookie =>
                    cookie.replace(/; Secure/gi, '').replace(/; SameSite=None/gi, '; SameSite=Lax')
                );
            }
        },
        onError: (err, req, res) => {
            console.error('Proxy Error:', err);
            res.status(502).json({ error: 'Bad Gateway', details: err.message });
        }
    });

    return proxy(req, res);
}
