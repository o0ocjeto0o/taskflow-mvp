document.addEventListener('DOMContentLoaded', () => {
  UIHelper.redirectIfAuthenticated();

  const errorBox = document.getElementById('authError');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // 1. XỬ LÝ FORM ĐĂNG KÝ
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    const submitBtn = document.getElementById('registerSubmitBtn');

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.classList.add('hidden');

      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirmPassword = document.getElementById('regConfirmPassword').value;

      if (!name) return showError('Vui lòng nhập tên hiển thị.');
      if (!isValidEmail(email)) return showError('Địa chỉ email không đúng định dạng.');
      if (password.length < 6) return showError('Mật khẩu phải có ít nhất 6 ký tự.');
      if (password !== confirmPassword) return showError('Mật khẩu xác nhận không khớp.');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang tạo tài khoản...';

        await ApiService.register({ name, email, password });
        window.location.href = 'dashboard.html';
      } catch (err) {
        showError(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng ký';
      }
    });
  }

  // 2. XỬ LÝ FORM ĐĂNG NHẬP
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const submitBtn = document.getElementById('loginSubmitBtn');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.classList.add('hidden');

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        return showError('Vui lòng nhập đầy đủ email và mật khẩu.');
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';

        await ApiService.login({ email, password });
        window.location.href = 'dashboard.html';
      } catch (err) {
        showError(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng nhập';
      }
    });
  }
});