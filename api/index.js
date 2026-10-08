let app;

module.exports = (req, res) => {
  if (!app) {
    try {
      const serverModule = require('../server/dist/server.js');
      app = serverModule.default || serverModule;
    } catch (err) {
      console.error('[Vercel Serverless Function Init Error]:', err);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVERLESS_INIT_ERROR',
          message: 'Failed to initialize serverless function',
          details: err.message,
        },
      });
    }
  }
  return app(req, res);
};
