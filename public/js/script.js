function copyLink(username) {
  var copyText = window.location.origin + "/share/" + username;
  document.getElementById("copy").setAttribute("data-clipboard-text", copyText);

  Swal.fire({
    html: `<div class="h1">📋</div> <div >Link Copied to Clipboard</div>`,
    timer: 2000,
    timerProgressBar: true,
    didOpen: () => {
      Swal.showLoading();
      timerInterval = setInterval(() => {
        b.textContent = Swal.getTimerLeft();
      }, 100);
    },
    willClose: () => {
      clearInterval(timerInterval);
    },
  });
}

$(function () {
  $('[data-toggle="tooltip"]').tooltip();
});
