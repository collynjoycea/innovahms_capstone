import Swal from 'sweetalert2';

const dialogOptions = {
  confirmButtonColor: '#047857',
  cancelButtonColor: '#64748b',
  customClass: { popup: 'rounded-lg' },
};

export const confirmAdminAction = ({
  title,
  text,
  confirmButtonText = 'Confirm',
  icon = 'warning',
}) => Swal.fire({
  ...dialogOptions,
  title,
  text,
  icon,
  showCancelButton: true,
  confirmButtonText,
  cancelButtonText: 'Cancel',
});

export const showAdminResult = ({ title, text, icon = 'success' }) => Swal.fire({
  ...dialogOptions,
  title,
  text,
  icon,
});
