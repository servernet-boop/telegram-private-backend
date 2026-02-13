// server.js - Telegram Private Backend untuk Vercel
const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Session storage (di memory, untuk Vercel sebaiknya pakai database)
// Tapi untuk demo kita simpan di memory dulu
let savedSession = '';

app.post('/api/send-telegram', async (req, res) => {
    try {
        const { apiId, apiHash, phone, message, code } = req.body;
        
        console.log('📨 Request received:', { phone, messageLength: message.length });
        
        // Convert apiId ke number
        const apiIdNum = parseInt(apiId);
        
        // Gunakan session yang sudah ada atau buat baru
        const session = new StringSession(savedSession);
        const client = new TelegramClient(session, apiIdNum, apiHash, {
            connectionRetries: 5,
            timeout: 30000,
            baseHash: 'dc4',
            baseIp: '149.154.167.51', // DC4 - Singapore (lebih cepat untuk Indonesia)
            basePort: 443,
            systemVersion: '1.0.0',
            appVersion: '1.0.0',
            deviceModel: 'Vercel Server',
            systemLanguage: 'en',
            langCode: 'en'
        });

        // Jika belum login
        if (!savedSession) {
            await client.start({
                phoneNumber: phone,
                phoneCode: async () => code, // Kode verifikasi dari user
                onError: (err) => {
                    console.error('❌ Login error:', err);
                }
            });
            console.log('✅ Login successful!');
            
            // Simpan session
            savedSession = client.session.save();
            console.log('💾 Session saved');
            
            return res.json({ 
                status: 'need_code',
                message: 'Kode verifikasi sudah dikirim ke Telegram. Masukkan kode-nya di form.'
            });
        } else {
            // Sudah login, langsung kirim pesan
            await client.connect();
            await client.sendMessage('me', { message });
            console.log('✅ Message sent to Saved Messages');
            
            return res.json({ 
                status: 'success',
                message: 'Pesan berhasil dikirim!'
            });
        }
    } catch (error) {
        console.error('❌ Error:', error);
        return res.json({ 
            status: 'error',
            error: error.message 
        });
    }
});

// Endpoint untuk cek status
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online',
        loggedIn: savedSession ? true : false
    });
});

// Untuk Vercel Serverless
module.exports = app;

// Untuk local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
