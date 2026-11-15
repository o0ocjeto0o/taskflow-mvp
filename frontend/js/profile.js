document.addEventListener('DOMContentLoaded', () => {
  const profilePage = document.getElementById('profilePage');
  if (!profilePage) return;

  let currentUser = UIHelper.initAppShell();
  if (!currentUser) return;

  function renderProfileInfo() {
    currentUser = StorageService.getCurrentUser();
    document.getElementById('profileAvatarLarge').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('profileDisplayNameHeading').textContent = currentUser.name;
    document.getElementById('profileJoinedDisplay').textContent = `Ngày tham gia: ${currentUser.created_at || 'Hôm nay'}`;
    document.getElementById('profileEmailDisplay').value = currentUser.email;
    document.getElementById('profileNameInput').value = currentUser.name;

    // Đồng bộ tên trên Top Header
    document.getElementById('headerUserName').textContent = currentUser.name;
    document.getElementById('headerUserAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  }

  // Cập nhật tên hiển thị
  document.getElementById('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = document.getElementById('profileNameInput').value.trim();
    if (!newName) {
      return UIHelper.showToast('Tên hiển thị không được để trống.', 'error');
    }

    try {
      StorageService.updateUserProfile(currentUser.id, newName);
      renderProfileInfo();
      UIHelper.showToast('Cập nhật tên hiển thị thành công!');
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    }
  });

  // Đổi mật khẩu
  document.getElementById('passwordForm').addEventListener('submit', (e) => {
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

    try {
      StorageService.changeUserPassword(currentUser.id, oldPass, newPass);
      document.getElementById('passwordForm').reset();
      UIHelper.showToast('Đổi mật khẩu thành công!');
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    }
  });

  renderProfileInfo();
});