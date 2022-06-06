const allowedOrigins = [process.env.FRONTEND_URL, process.env.BACKEND_URL];

const credentials = (req, res, next) => {
  const { origin } = req.headers;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Credentials', true);
  }
  next();
};

module.exports = credentials;
