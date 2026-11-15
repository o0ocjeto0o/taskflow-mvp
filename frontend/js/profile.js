document.addEventListener('DOMContentLoaded', () => {
  const profilePage = document.getElementById('profilePage');
  if (!profilePage) return;

  const initialUser = UIHelper.initAppShell();
  if (!initialUser) return;

  function fillProfileUI(user) {
    document.getElementById('profileAvatarLarge').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('profileDisplayNameHeading').textContent = user.name;
    document.getElementById('profileJoinedDisplay').textContent = `Ngày tham gia: ${user.created_at || '--'}`;
    document.getElementById('profileEmailDisplay').value = user.email;
    document.getElementById('profileNameInput').value = user.name;

    // Đồng bộ tên trên Top Header
    document.getElementById('headerUserName').textContent = user.name;
    document.getElementById('headerUserAvatar').textContent = user.name.charAt(0).toUpperCase();
  }

  async function loadProfileFromServer() {
    fillProfileUI(initialUser);
    try {
      const freshUser = await ApiService.getMe();
      fillProfileUI(freshUser);
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    }
  }

  // Cập nhật tên hiển thị
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('profileNameInput').value.trim();
    if (!newName) {
      return UIHelper.showToast('Tên hiển thị không được để trống.', 'error');
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    try {
      submitBtn.disabled = true;
      const updatedUser = await ApiService.updateProfile(newName);
      fillProfileUI(updatedUser);
      UIHelper.showToast('Cập nhật tên hiển thị thành công!');
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Đổi mật khẩu trên Server
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPass = document.getElementById('oldPasswordInput').value;
    const newPass = document.getElementById('newPasswordInput').value;
    const confirmPass = document.getElementById('confirmNewPasswordInput').value;

    if (newPass.length < 6) {
      return UIHelper.showToast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
    }
    if (newPass !== confirmPass) {
      return UIHelper.showToast('Mật khẩu xác nhận không khớp.', 'error');
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    try {
      submitBtn.disabled = true;
      await ApiService.changePassword(oldPass, newPass);
      document.getElementById('passwordForm').reset();
      UIHelper.showToast('Đổi mật khẩu thành công!');
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  loadProfileFromServer();
});