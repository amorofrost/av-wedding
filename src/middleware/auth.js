// Простая защита админ-раздела паролем (сессия в cookie).

export function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

// Проверка пароля из формы логина.
export function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || 'changeme';
  return typeof password === 'string' && password.length > 0 && password === expected;
}
