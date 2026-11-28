const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer ([^\s]+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  if (
    typeof payload.sub !== 'string' ||
    !['user', 'coach'].includes(payload.role)
  ) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = { id: payload.sub, role: payload.role };
  return next();
}

module.exports = authenticateToken;